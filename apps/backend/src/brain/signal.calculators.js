const Order = require("../models/order.model");

async function calcStockVelocity(shopId) {
  if (!shopId) return 0;
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await Order.aggregate([
    {
      $match: {
        shopId,
        createdAt: { $gte: since },
        status: { $nin: ["CANCELLED", "REFUNDED"] },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: null,
        units: { $sum: "$items.quantity" },
      },
    },
  ]);
  return Number((Number(rows[0]?.units || 0) / 7).toFixed(2));
}

async function calcRevenueTrend(shopId) {
  if (!shopId) return 0;
  const now = Date.now();
  const currentSince = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const previousSince = new Date(now - 14 * 24 * 60 * 60 * 1000);
  const previousUntil = currentSince;

  const [currentRows, previousRows] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          shopId,
          createdAt: { $gte: currentSince },
          status: { $nin: ["CANCELLED", "REFUNDED"] },
        },
      },
      { $group: { _id: null, amount: { $sum: "$totalAmount" } } },
    ]),
    Order.aggregate([
      {
        $match: {
          shopId,
          createdAt: { $gte: previousSince, $lt: previousUntil },
          status: { $nin: ["CANCELLED", "REFUNDED"] },
        },
      },
      { $group: { _id: null, amount: { $sum: "$totalAmount" } } },
    ]),
  ]);

  const currentAmount = Number(currentRows[0]?.amount || 0);
  const previousAmount = Number(previousRows[0]?.amount || 0);
  if (!previousAmount) return currentAmount > 0 ? 1 : 0;
  return Number(((currentAmount - previousAmount) / previousAmount).toFixed(4));
}

async function calcRefundRate(shopId) {
  if (!shopId) return 0;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [totalOrders, refundedOrders] = await Promise.all([
    Order.countDocuments({ shopId, createdAt: { $gte: since } }),
    Order.countDocuments({
      shopId,
      createdAt: { $gte: since },
      status: { $in: ["REFUNDED", "CANCELLED"] },
    }),
  ]);

  if (!totalOrders) return 0;
  return Number((refundedOrders / totalOrders).toFixed(4));
}

async function detectOrderSpike(shopId) {
  if (!shopId) return 0;
  const now = Date.now();
  const last24h = new Date(now - 24 * 60 * 60 * 1000);
  const last8d = new Date(now - 8 * 24 * 60 * 60 * 1000);

  const [recentCount, priorRows] = await Promise.all([
    Order.countDocuments({
      shopId,
      createdAt: { $gte: last24h },
      status: { $nin: ["CANCELLED", "REFUNDED"] },
    }),
    Order.aggregate([
      {
        $match: {
          shopId,
          createdAt: { $gte: last8d, $lt: last24h },
          status: { $nin: ["CANCELLED", "REFUNDED"] },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const baseline =
    priorRows.length > 0
      ? priorRows.reduce((sum, row) => sum + Number(row.count || 0), 0) / priorRows.length
      : 0;

  if (!baseline) return recentCount > 0 ? 1 : 0;
  return Number((recentCount / baseline).toFixed(4));
}

module.exports = {
  calcStockVelocity,
  calcRevenueTrend,
  calcRefundRate,
  detectOrderSpike,
};
