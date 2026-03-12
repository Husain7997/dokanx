const mongoose = require("mongoose");
const PosSyncQueue = require("./models/posSyncQueue.model");
const PosSession = require("./models/posSession.model");
const PosSale = require("./models/posSale.model");
const PosPayment = require("./models/posPayment.model");
const Order = require("@/models/order.model");
const PaymentAttempt = require("@/models/paymentAttempt.model");
const inventory = require("@/inventory");
const { publishDomainEvent } = require("@/platform/events/event.publisher");
const { addJob } = require("@/core/infrastructure");

function normalizePaymentTypes(paymentTypes = []) {
  return paymentTypes.map(type => String(type || "").trim().toUpperCase());
}

function buildOrderItems(items = []) {
  return items.map(item => ({
    product: item.product || item.productId,
    quantity: Number(item.quantity || 0),
    price: Number(item.price || 0),
  }));
}

function buildPaymentProvider(paymentTypes = []) {
  const primary = normalizePaymentTypes(paymentTypes)[0] || "CASH";
  return {
    provider: `pos_${String(primary).toLowerCase()}`,
    gateway: "pos",
    method: primary,
  };
}

async function openSession({ shopId, terminalId, openedBy = null }) {
  return PosSession.findOneAndUpdate(
    {
      shopId,
      terminalId: String(terminalId).trim(),
      status: { $in: ["OPEN", "SYNCING"] },
    },
    {
      $set: {
        shopId,
        terminalId: String(terminalId).trim(),
        openedBy,
        status: "OPEN",
      },
      $setOnInsert: {
        openedAt: new Date(),
      },
    },
    {
      upsert: true,
      returnDocument: "after",
    }
  );
}

async function closeSession({ shopId, terminalId }) {
  const sessionRow = await PosSession.findOne({
    shopId,
    terminalId: String(terminalId).trim(),
    status: { $in: ["OPEN", "SYNCING"] },
  });

  if (!sessionRow) {
    throw new Error("POS session not found");
  }

  sessionRow.status = "CLOSED";
  sessionRow.lastSyncedAt = new Date();
  await sessionRow.save();
  return sessionRow;
}

async function listSessions({ shopId, status = "" }) {
  const query = { shopId };
  if (status) query.status = String(status).trim().toUpperCase();

  const result = PosSession.find(query).sort({ updatedAt: -1 });
  if (result && typeof result.lean === "function") {
    return result.lean();
  }
  return result;
}

async function enqueueOfflineSale({
  shopId,
  terminalId,
  clientMutationId,
  payload,
  paymentTypes = [],
}) {
  const existing = await PosSyncQueue.findOne({
    shopId,
    terminalId,
    clientMutationId,
  });

  if (existing) {
    return { duplicate: true, queueItem: existing };
  }

  const queueItem = await PosSyncQueue.create({
    shopId,
    terminalId,
    clientMutationId,
    payload,
    paymentTypes: normalizePaymentTypes(paymentTypes),
    status: "PENDING",
  });

  return { duplicate: false, queueItem };
}

async function listOfflineQueue({ shopId, terminalId = "", status = "" }) {
  const query = { shopId };
  if (terminalId) query.terminalId = String(terminalId).trim();
  if (status) query.status = String(status).trim().toUpperCase();

  const result = PosSyncQueue.find(query).sort({ createdAt: 1 });
  if (result && typeof result.lean === "function") {
    return result.lean();
  }
  return result;
}

async function processOfflineQueueItem(row) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const items = buildOrderItems(row.payload?.items || []);
    if (!items.length) {
      throw new Error("POS queue item has no sale items");
    }

    const totalAmount = Number(
      row.payload?.totals?.grandTotal ??
      row.payload?.totals?.totalAmount ??
      items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 0)), 0)
    );

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw new Error("POS queue item totalAmount must be greater than 0");
    }

    const order = await Order.create(
      [
        {
          shopId: row.shopId,
          user: null,
          items,
          totalAmount,
          isGuest: true,
          contact: row.payload?.customer || {},
          isCompleted: true,
          paymentStatus: "SUCCESS",
          status: "DELIVERED",
          pricing: {
            subtotal: totalAmount,
            discountTotal: 0,
            grandTotal: totalAmount,
          },
        },
      ],
      { session }
    );

    const createdOrder = order[0];

    const paymentProvider = buildPaymentProvider(row.paymentTypes);
    const providerPaymentId = `pos_${row.terminalId}_${row.clientMutationId}`;
    await PaymentAttempt.create(
      [
        {
          order: createdOrder._id,
          shopId: row.shopId,
          amount: totalAmount,
          provider: paymentProvider.provider,
          gateway: paymentProvider.gateway,
          providerPaymentId,
          status: "SUCCESS",
          processed: true,
          processedAt: new Date(),
          billingSnapshot: {
            orderChannel: "POS",
            paymentMethod: paymentProvider.method,
            routing: {
              destination: "SHOP_WALLET",
              gatewayKey: paymentProvider.gateway,
              source: "POS_SYNC",
            },
            commission: {
              rate: 0,
              amount: 0,
              source: "POS_SYNC",
            },
          },
        },
      ],
      { session }
    );

    await PosSession.findOneAndUpdate(
      {
        shopId: row.shopId,
        terminalId: row.terminalId,
        status: { $in: ["OPEN", "SYNCING"] },
      },
      {
        $set: {
          shopId: row.shopId,
          terminalId: row.terminalId,
          status: "SYNCING",
          lastSyncedAt: new Date(),
        },
        $setOnInsert: {
          openedAt: new Date(),
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        session,
      }
    );

    for (const item of items) {
      await inventory.createInventoryEntry({
        shopId: row.shopId,
        productId: item.product,
        quantity: item.quantity,
        type: "POS_SALE",
        direction: "OUT",
        referenceId: createdOrder._id,
        meta: {
          referenceModel: "Order",
        },
      });
    }

    const [posSale] = await PosSale.create(
      [
        {
          shopId: row.shopId,
          terminalId: row.terminalId,
          queueId: row._id,
          orderId: createdOrder._id,
          customer: {
            phone: String(row.payload?.customer?.phone || ""),
            name: String(row.payload?.customer?.name || ""),
          },
          items: items.map(item => ({
            productId: item.product,
            quantity: item.quantity,
            price: item.price,
          })),
          totalAmount,
          paymentTypes: row.paymentTypes,
          syncedAt: new Date(),
        },
      ],
      { session }
    );

    await PosPayment.create(
      normalizePaymentTypes(row.paymentTypes).map(method => ({
        shopId: row.shopId,
        posSaleId: posSale._id,
        orderId: createdOrder._id,
        method,
        amount: totalAmount,
        providerPaymentId: `${providerPaymentId}_${method.toLowerCase()}`,
        status: "SUCCESS",
      })),
      { session }
    );

    await publishDomainEvent({
      eventName: "POS_SYNC_COMPLETED",
      tenantId: row.shopId,
      aggregateId: createdOrder._id,
      idempotencyKey: `pos_sync_${row.shopId}_${row.terminalId}_${row.clientMutationId}`,
      payload: {
        orderId: createdOrder._id,
        queueId: row._id,
        terminalId: row.terminalId,
        paymentTypes: row.paymentTypes,
        totalAmount,
      },
      session,
    });

    await session.commitTransaction();

    await addJob("settlement", {
      shopId: row.shopId,
      grossAmount: totalAmount,
      fee: 0,
      idempotencyKey: `pos_settlement_${row.shopId}_${row.terminalId}_${row.clientMutationId}`,
    });

    return createdOrder;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

async function syncOfflineQueue({
  shopId,
  terminalId = "",
  processor = processOfflineQueueItem,
}) {
  const query = {
    shopId,
    status: { $in: ["PENDING", "FAILED"] },
  };
  if (terminalId) query.terminalId = String(terminalId).trim();

  const rows = await PosSyncQueue.find(query).sort({ createdAt: 1 });
  let synced = 0;
  let failed = 0;

  for (const row of rows) {
    row.status = "PROCESSING";
    row.attemptCount += 1;
    row.lastError = "";
    await row.save();

    try {
      const result = await processor(row);
      row.status = "SYNCED";
      row.syncedAt = new Date();
      row.lastError = "";
      if (result?._id) {
        row.payload = {
          ...row.payload,
          syncedOrderId: result._id,
        };
      }
      await row.save();
      synced += 1;
    } catch (err) {
      row.status = "FAILED";
      row.lastError = err.message || "Sync failed";
      await row.save();
      failed += 1;
    }
  }

  return {
    synced,
    failed,
    total: rows.length,
  };
}

module.exports = {
  _internals: {
    buildOrderItems,
    buildPaymentProvider,
    processOfflineQueueItem,
  },
  openSession,
  closeSession,
  listSessions,
  enqueueOfflineSale,
  listOfflineQueue,
  syncOfflineQueue,
};
