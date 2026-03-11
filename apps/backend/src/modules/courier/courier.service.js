const CourierShipment = require("./models/courierShipment.model");
const Order = require("@/models/order.model");

const ORDER_STATUS_BY_EVENT = {
  ORDER_PICKED: "CONFIRMED",
  IN_TRANSIT: "SHIPPED",
  OUT_FOR_DELIVERY: "SHIPPED",
  DELIVERED: "DELIVERED",
  RETURNED: "CANCELLED",
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
  const trackingCode = String(payload.trackingCode || "").trim() || buildTrackingCode({
    courier,
    orderId: payload.orderId,
  });

  return CourierShipment.create({
    shopId,
    orderId: payload.orderId,
    courier,
    trackingCode,
    externalReference: String(payload.externalReference || "").trim(),
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
        note: "Shipment created",
        rawPayload: null,
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

  shipment.status = event;
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

  const orderStatus = ORDER_STATUS_BY_EVENT[event];
  if (orderStatus) {
    await Order.updateOne(
      { _id: shipment.orderId, shopId: shipment.shopId },
      { $set: { status: orderStatus } }
    );
  }

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
  },
  createShipment,
  listShipments,
  getShipment,
  applyWebhookEvent,
  reconcileCod,
  getCourierDashboard,
  listCodMismatches,
  buildShipmentExportRows,
};
