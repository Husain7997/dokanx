const mongoose = require("mongoose");
const Order = require("@/models/order.model");
const Ledger = require("@/modules/ledger/ledger.model");
const InventoryLedger = require("@/models/inventoryLedger.model");
const MetricBucket = require("./metricBucket.model");

function floorToMinute(date = new Date()) {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return d;
}

function normalizeTenantId(tenantId) {
  if (!tenantId) return null;
  if (!mongoose.Types.ObjectId.isValid(String(tenantId))) return null;
  return new mongoose.Types.ObjectId(String(tenantId));
}

async function computeMinuteCounts({ tenantId, minuteAt }) {
  const start = floorToMinute(minuteAt);
  const end = new Date(start.getTime() + 60 * 1000);

  const [ordersCount, walletTxCount, inventoryMovesCount] =
    await Promise.all([
      Order.countDocuments({
        ...(tenantId
          ? {
              $or: [{ shopId: tenantId }, { shop: tenantId }]
            }
          : {}),
        createdAt: { $gte: start, $lt: end }
      }),
      Ledger.countDocuments({
        ...(tenantId ? { shopId: tenantId } : {}),
        createdAt: { $gte: start, $lt: end }
      }),
      InventoryLedger.countDocuments({
        ...(tenantId ? { shopId: tenantId } : {}),
        createdAt: { $gte: start, $lt: end }
      })
    ]);

  return {
    minuteAt: start,
    ordersCount,
    walletTxCount,
    inventoryMovesCount
  };
}

async function persistMinuteBucket({ tenantId = null, minuteAt = new Date() } = {}) {
  const normalizedTenant = normalizeTenantId(tenantId);
  const counts = await computeMinuteCounts({
    tenantId: normalizedTenant,
    minuteAt
  });

  await MetricBucket.updateOne(
    { tenantId: normalizedTenant, minuteAt: counts.minuteAt },
    {
      $set: {
        ordersCount: counts.ordersCount,
        walletTxCount: counts.walletTxCount,
        inventoryMovesCount: counts.inventoryMovesCount,
        computedAt: new Date()
      }
    },
    { upsert: true }
  );

  return counts;
}

async function getBucketMetrics({
  tenantId = null,
  minutes = 60
} = {}) {
  const safeMinutes = Math.max(1, Math.min(Number(minutes) || 60, 24 * 60));
  const normalizedTenant = normalizeTenantId(tenantId);

  await persistMinuteBucket({
    tenantId: normalizedTenant,
    minuteAt: new Date()
  });

  const from = new Date(Date.now() - safeMinutes * 60 * 1000);
  const buckets = await MetricBucket.find({
    tenantId: normalizedTenant,
    minuteAt: { $gte: floorToMinute(from) }
  })
    .sort({ minuteAt: 1 })
    .lean();

  const summary = buckets.reduce(
    (acc, item) => {
      acc.orders += item.ordersCount || 0;
      acc.walletTransactions += item.walletTxCount || 0;
      acc.inventoryMovements += item.inventoryMovesCount || 0;
      return acc;
    },
    { orders: 0, walletTransactions: 0, inventoryMovements: 0 }
  );

  return {
    timestamp: Date.now(),
    tenantId: normalizedTenant ? String(normalizedTenant) : null,
    windowMinutes: safeMinutes,
    summary,
    buckets
  };
}

async function getPlatformMetrics() {
  const from = new Date(Date.now() - 60 * 1000);

  const [ordersPerMin, walletTxPerMin, inventoryMovesPerMin] =
    await Promise.all([
      Order.countDocuments({ createdAt: { $gte: from } }),
      Ledger.countDocuments({ createdAt: { $gte: from } }),
      InventoryLedger.countDocuments({ createdAt: { $gte: from } })
    ]);

  return {
    timestamp: Date.now(),
    ordersPerMinute: ordersPerMin,
    walletTransactionsPerMinute: walletTxPerMin,
    inventoryMovementsPerMinute: inventoryMovesPerMin
  };
}

module.exports = {
  getPlatformMetrics,
  persistMinuteBucket,
  getBucketMetrics
};
