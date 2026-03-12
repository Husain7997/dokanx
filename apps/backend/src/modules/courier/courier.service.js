const CourierShipment = require("./models/courierShipment.model");
const Order = require("@/models/order.model");
const Shop = require("@/models/shop.model");
const { enqueueNotification } = require("@/platform/notifications/notification.service");
const { getProvider } = require("./courierProviderRegistry");

const ORDER_STATUS_BY_EVENT = {
  ORDER_PICKED: "CONFIRMED",
  IN_TRANSIT: "SHIPPED",
  OUT_FOR_DELIVERY: "SHIPPED",
  DELIVERED: "DELIVERED",
  RETURNED: "RETURNED",
  RETURNED_TO_SENDER: "RETURNED",
  DELIVERY_FAILED: "CANCELLED",
  CANCELLED: "CANCELLED",
};

const SHIPMENT_STATUS_ALIASES = {
  PICKUP_REQUESTED: "ORDER_PICKED",
  PICKED_UP: "ORDER_PICKED",
  PICKED: "ORDER_PICKED",
  ORDER_PICKED: "ORDER_PICKED",
  IN_TRANSIT: "IN_TRANSIT",
  TRANSIT: "IN_TRANSIT",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  RETURN: "RETURNED",
  RETURNED: "RETURNED",
  RETURNED_TO_SENDER: "RETURNED",
  DELIVERY_FAILED: "FAILED",
  FAILED: "FAILED",
  CANCELLED: "FAILED",
};

function asUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildTrackingCode({ courier, orderId }) {
  const prefix = asUpper(courier).slice(0, 3) || "CRR";
  const suffix = String(orderId || "").slice(-8).toUpperCase() || Date.now().toString().slice(-8);
  return `${prefix}-${suffix}`;
}

function normalizeShipmentStatus(event) {
  return SHIPMENT_STATUS_ALIASES[asUpper(event)] || asUpper(event);
}

async function syncOrderStatusForShipment(shipment) {
  const orderStatus = ORDER_STATUS_BY_EVENT[shipment.status];
  if (!orderStatus) return;

  await Order.updateOne(
    { _id: shipment.orderId, shopId: shipment.shopId },
    { $set: { status: orderStatus } }
  );
}

function computeCodReconciliation({ expected = 0, actual = 0 }) {
  const normalizedExpected = toNumber(expected, 0);
  const normalizedActual = toNumber(actual, 0);

  if (normalizedActual === 0) return "PENDING";
  return normalizedExpected === normalizedActual ? "MATCHED" : "MISMATCH";
}

async function createShipment({ shopId, actorId, payload }) {
  const order = await Order.findOne({ _id: payload.orderId, shopId });
  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  const courier = asUpper(payload.courier);
  const provider = getProvider(courier);
  const trackingCode = String(payload.trackingCode || "").trim() || buildTrackingCode({
    courier,
    orderId: payload.orderId,
  });
  const providerResult = provider
    ? await provider.createShipment({
        orderId: payload.orderId,
        trackingCode,
        recipient: payload.recipient,
      })
    : null;

  return CourierShipment.create({
    shopId,
    orderId: payload.orderId,
    courier,
    trackingCode,
    externalReference: String(providerResult?.normalizedResponse?.externalReference || providerResult?.externalReference || payload.externalReference || "").trim(),
    recipient: {
      name: String(payload?.recipient?.name || "").trim(),
      phone: String(payload?.recipient?.phone || "").trim(),
      address: String(payload?.recipient?.address || "").trim(),
    },
    cashOnDeliveryAmount: toNumber(payload.cashOnDeliveryAmount, 0),
    codCollectedAmount: 0,
    codReconciliationStatus: "PENDING",
    createdBy: actorId || null,
    updatedBy: actorId || null,
    events: [
      {
        event: "CREATED",
        status: "CREATED",
        note: providerResult?.status === "MANUAL_CONFIG_REQUIRED" ? "Shipment created without live courier credentials" : "Shipment created",
        rawPayload: providerResult || null,
        createdAt: new Date(),
      },
    ],
  });
}

async function listShipments({ shopId, filters = {} }) {
  const query = { shopId };
  if (filters.courier) query.courier = asUpper(filters.courier);
  if (filters.status) query.status = asUpper(filters.status);

  const limit = Math.min(Math.max(toNumber(filters.limit, 20), 1), 100);
  return CourierShipment.find(query).sort({ createdAt: -1 }).limit(limit).lean();
}

async function getShipment({ shopId, shipmentId }) {
  return CourierShipment.findOne({ _id: shipmentId, shopId }).lean();
}

async function fetchShipmentStatus({ shopId, shipmentId }) {
  const shipment = await CourierShipment.findOne({ _id: shipmentId, shopId });
  if (!shipment) {
    const err = new Error("Shipment not found");
    err.statusCode = 404;
    throw err;
  }

  const provider = getProvider(shipment.courier);
  if (!provider) {
    return {
      provider: shipment.courier,
      normalizedResponse: {
        accepted: false,
        shipmentStatus: shipment.status,
        providerStatus: 0,
        mode: "UNSUPPORTED",
        raw: null,
      },
    };
  }

  return provider.fetchShipmentStatus(shipment);
}

async function pollActiveShipmentStatuses({ limit = 25 } = {}) {
  const rows = await CourierShipment.find({
    status: { $in: ["CREATED", "ORDER_PICKED", "IN_TRANSIT", "OUT_FOR_DELIVERY"] },
  })
    .sort({ updatedAt: 1 })
    .limit(Math.min(Math.max(Number(limit) || 25, 1), 100));

  let polled = 0;
  let updated = 0;

  for (const shipment of rows) {
    polled += 1;
    const provider = getProvider(shipment.courier);
    if (!provider) continue;

    const statusResult = await provider.fetchShipmentStatus(shipment);
    const nextStatus = normalizeShipmentStatus(
      String(statusResult?.normalizedResponse?.shipmentStatus || "").trim().toUpperCase()
    );
    if (nextStatus && nextStatus !== shipment.status) {
      shipment.status = nextStatus;
      shipment.events.push({
        event: "POLLED_STATUS",
        status: nextStatus,
        note: "Shipment status updated from provider poll",
        rawPayload: statusResult,
        createdAt: new Date(),
      });
      shipment.lastWebhookAt = new Date();
      await shipment.save();
      await syncOrderStatusForShipment(shipment);
      updated += 1;
    }
  }

  return {
    polled,
    updated,
  };
}

async function applyWebhookEvent({ payload }) {
  const courier = asUpper(payload.courier);
  const trackingCode = String(payload.trackingCode || "").trim();
  const event = asUpper(payload.event);

  const shipment = await CourierShipment.findOne({
    courier,
    trackingCode,
  });

  if (!shipment) {
    const err = new Error("Shipment not found");
    err.statusCode = 404;
    throw err;
  }

  shipment.status = normalizeShipmentStatus(event);
  shipment.lastWebhookAt = new Date();
  shipment.codCollectedAmount = toNumber(
    payload.codCollectedAmount,
    shipment.codCollectedAmount
  );
  shipment.codReconciliationStatus = computeCodReconciliation({
    expected: shipment.cashOnDeliveryAmount,
    actual: shipment.codCollectedAmount,
  });
  shipment.events.push({
    event,
    status: event,
    note: String(payload.note || "").trim(),
    rawPayload: payload,
    createdAt: new Date(),
  });

  await shipment.save();
  await syncOrderStatusForShipment(shipment);

  return shipment;
}

async function reconcileCod({ shopId, shipmentId, actualAmount }) {
  const shipment = await CourierShipment.findOne({ _id: shipmentId, shopId });
  if (!shipment) {
    const err = new Error("Shipment not found");
    err.statusCode = 404;
    throw err;
  }

  shipment.codCollectedAmount = toNumber(actualAmount, 0);
  shipment.codReconciliationStatus = computeCodReconciliation({
    expected: shipment.cashOnDeliveryAmount,
    actual: shipment.codCollectedAmount,
  });
  shipment.events.push({
    event: "COD_RECONCILED",
    status: shipment.status,
    note: `COD reconciliation updated to ${shipment.codReconciliationStatus}`,
    rawPayload: { actualAmount: shipment.codCollectedAmount },
    createdAt: new Date(),
  });

  await shipment.save();
  return shipment;
}

async function getCourierDashboard({ shopId, filters = {} }) {
  const query = { shopId };
  if (filters.courier) query.courier = asUpper(filters.courier);

  const [statusAgg, courierAgg, codAgg, recentDelays] = await Promise.all([
    CourierShipment.aggregate([
      { $match: query },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    CourierShipment.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$courier",
          shipmentCount: { $sum: 1 },
          deliveredCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "DELIVERED"] }, 1, 0],
            },
          },
        },
      },
      { $sort: { shipmentCount: -1 } },
    ]),
    CourierShipment.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$codReconciliationStatus",
          count: { $sum: 1 },
          totalExpected: { $sum: "$cashOnDeliveryAmount" },
          totalCollected: { $sum: "$codCollectedAmount" },
        },
      },
    ]),
    CourierShipment.find({
      ...query,
      status: { $in: ["IN_TRANSIT", "OUT_FOR_DELIVERY"] },
    })
      .sort({ updatedAt: 1 })
      .limit(10)
      .lean(),
  ]);

  return {
    statusBreakdown: statusAgg,
    courierBreakdown: courierAgg,
    codBreakdown: codAgg,
    delayedCandidates: recentDelays,
  };
}

async function listCourierAnomalies({ shopId = null, limit = 20 } = {}) {
  const query = {};
  if (shopId) query.shopId = shopId;

  const candidates = await CourierShipment.find({
    ...query,
    status: { $in: ["IN_TRANSIT", "OUT_FOR_DELIVERY", "FAILED", "RETURNED"] },
  })
    .sort({ updatedAt: 1 })
    .limit(Math.min(Math.max(Number(limit) || 20, 1), 100))
    .lean();

  const now = Date.now();
  return candidates.flatMap(row => {
    const anomalies = [];
    const ageHours = row.updatedAt ? (now - new Date(row.updatedAt).getTime()) / (1000 * 60 * 60) : 0;

    if (["IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(row.status) && ageHours >= 48) {
      anomalies.push({
        shipmentId: row._id,
        orderId: row.orderId,
        shopId: row.shopId,
        courier: row.courier,
        type: "DELIVERY_DELAY",
        severity: ageHours >= 72 ? "HIGH" : "MEDIUM",
        message: `Shipment delayed for ${Math.floor(ageHours)} hour(s)`,
      });
    }

    if (row.status === "FAILED") {
      anomalies.push({
        shipmentId: row._id,
        orderId: row.orderId,
        shopId: row.shopId,
        courier: row.courier,
        type: "DELIVERY_FAILURE",
        severity: "HIGH",
        message: "Shipment delivery failed",
      });
    }

    if (row.status === "RETURNED") {
      anomalies.push({
        shipmentId: row._id,
        orderId: row.orderId,
        shopId: row.shopId,
        courier: row.courier,
        type: "RETURNED_SHIPMENT",
        severity: "MEDIUM",
        message: "Shipment returned to sender",
      });
    }

    return anomalies;
  });
}

async function escalateCourierAnomalies({ shopId = null, limit = 20 } = {}) {
  const anomalies = await listCourierAnomalies({ shopId, limit });
  const highSeverity = anomalies.filter(item => item.severity === "HIGH");
  let notified = 0;

  for (const anomaly of highSeverity) {
    const shop = await Shop.findById(anomaly.shopId).populate("owner", "_id email phone");
    if (!shop?.owner?._id) continue;

    const channels = ["inapp"];
    if (shop.owner.email) channels.push("email");

    await enqueueNotification({
      tenantId: anomaly.shopId,
      userId: shop.owner._id,
      channels,
      to: shop.owner.email || undefined,
      subject: "Courier anomaly alert",
      message: anomaly.message,
      data: {
        type: anomaly.type,
        shipmentId: anomaly.shipmentId,
        orderId: anomaly.orderId,
        severity: anomaly.severity,
      },
      idempotencyKey: `courier_anomaly_${anomaly.type}_${anomaly.shipmentId}_${anomaly.severity}`,
    });
    notified += 1;
  }

  return {
    anomalies: anomalies.length,
    notified,
  };
}

async function listCodMismatches({ shopId, limit = 50 }) {
  return CourierShipment.find({
    shopId,
    codReconciliationStatus: "MISMATCH",
  })
    .sort({ updatedAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 50, 1), 200))
    .lean();
}

async function buildShipmentExportRows({ shopId, filters = {} }) {
  const rows = await listShipments({ shopId, filters });
  return rows.map(row => ({
    shipmentId: String(row._id || ""),
    orderId: String(row.orderId || ""),
    courier: String(row.courier || ""),
    trackingCode: String(row.trackingCode || ""),
    status: String(row.status || ""),
    codExpected: Number(row.cashOnDeliveryAmount || 0),
    codCollected: Number(row.codCollectedAmount || 0),
    codStatus: String(row.codReconciliationStatus || ""),
    createdAt: row.createdAt || "",
  }));
}

module.exports = {
  _internals: {
    buildTrackingCode,
    computeCodReconciliation,
    normalizeShipmentStatus,
  },
  createShipment,
  listShipments,
  getShipment,
  fetchShipmentStatus,
  pollActiveShipmentStatuses,
  applyWebhookEvent,
  reconcileCod,
  getCourierDashboard,
  listCourierAnomalies,
  escalateCourierAnomalies,
  listCodMismatches,
  buildShipmentExportRows,
};
