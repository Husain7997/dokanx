const Order = require("../models/order.model");
const Inventory = require("../models/Inventory.model");
const Product = require("../models/product.model");
const Shipment = require("../models/shipment.model");
const Wallet = require("../models/wallet.model");
const WalletTransaction = require("../models/walletTransaction.model");
const AnalyticsSnapshot = require("./analyticsSnapshot.model");

function parseDateRange({ dateFrom, dateTo }) {
  const end = dateTo ? new Date(dateTo) : new Date();
  const start = dateFrom
    ? new Date(dateFrom)
    : new Date(end.getTime() - 1000 * 60 * 60 * 24 * 30);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function buildMatch({ shopId, start, end }) {
  const match = {
    createdAt: { $gte: start, $lte: end },
  };
  if (shopId) {
    match.shopId = shopId;
  }
  return match;
}

async function buildDailySales({ shopId, start, end }) {
  const rows = await Order.aggregate([
    { $match: buildMatch({ shopId, start, end }) },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        gmv: { $sum: "$totalAmount" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return rows.map((row) => ({
    date: row._id,
    gmv: row.gmv || 0,
    orders: row.orders || 0,
    aov: row.orders ? row.gmv / row.orders : 0,
  }));
}

async function buildTrendAnalytics(dailySales) {
  const points = dailySales.slice(-14).map((row) => ({
    label: row.date,
    value: Number(row.gmv || 0),
  }));
  return { current: points };
}

async function buildMerchantCohorts({ shopId, start, end }) {
  const rows = await Order.aggregate([
    {
      $match: {
        ...buildMatch({ shopId, start, end }),
        user: { $ne: null },
      },
    },
    {
      $group: {
        _id: "$user",
        firstOrder: { $min: "$createdAt" },
        orderCount: { $sum: 1 },
      },
    },
    {
      $project: {
        cohort: {
          $dateToString: { format: "%Y-%m", date: "$firstOrder" },
        },
        orderCount: 1,
      },
    },
    {
      $group: {
        _id: "$cohort",
        merchantCount: { $sum: 1 },
        activeMerchantCount: {
          $sum: { $cond: [{ $gt: ["$orderCount", 1] }, 1, 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return rows.map((row) => ({
    cohort: row._id,
    merchantCount: row.merchantCount || 0,
    activeMerchantCount: row.activeMerchantCount || 0,
    retentionRate: row.merchantCount
      ? row.activeMerchantCount / row.merchantCount
      : 0,
  }));
}

async function buildCategorySplit({ shopId, start, end }) {
  const rows = await Order.aggregate([
    { $match: buildMatch({ shopId, start, end }) },
    { $unwind: "$items" },
    {
      $lookup: {
        from: Product.collection.name,
        localField: "items.product",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        category: { $ifNull: ["$product.category", "Uncategorized"] },
        quantity: { $ifNull: ["$items.quantity", 0] },
        itemPrice: {
          $ifNull: ["$items.price", { $ifNull: ["$product.price", 0] }],
        },
      },
    },
    {
      $group: {
        _id: "$category",
        revenue: { $sum: { $multiply: ["$itemPrice", "$quantity"] } },
        quantity: { $sum: "$quantity" },
      },
    },
    {
      $project: {
        _id: 0,
        category: "$_id",
        revenue: 1,
        quantity: 1,
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  return rows;
}

async function buildChannelSplit({ shopId, start, end }) {
  const rows = await Order.aggregate([
    { $match: buildMatch({ shopId, start, end }) },
    {
      $group: {
        _id: "$channel",
        gmv: { $sum: "$totalAmount" },
        orders: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        channel: { $ifNull: ["$_id", "UNKNOWN"] },
        gmv: 1,
        orders: 1,
      },
    },
    { $sort: { gmv: -1 } },
  ]);

  return rows;
}

async function buildTopProducts({ shopId, start, end }) {
  const rows = await Order.aggregate([
    { $match: buildMatch({ shopId, start, end }) },
    { $unwind: "$items" },
    {
      $lookup: {
        from: Product.collection.name,
        localField: "items.product",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        productId: "$items.product",
        name: { $ifNull: ["$product.name", "Product"] },
        quantity: { $ifNull: ["$items.quantity", 0] },
        itemPrice: {
          $ifNull: ["$items.price", { $ifNull: ["$product.price", 0] }],
        },
      },
    },
    {
      $group: {
        _id: "$productId",
        name: { $first: "$name" },
        revenue: { $sum: { $multiply: ["$itemPrice", "$quantity"] } },
        quantity: { $sum: "$quantity" },
      },
    },
    {
      $project: {
        _id: 0,
        productId: "$_id",
        name: 1,
        revenue: 1,
        quantity: 1,
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 10 },
  ]);

  return rows;
}

async function buildCustomerRepeatRate({ shopId, start, end }) {
  const rows = await Order.aggregate([
    {
      $match: {
        ...buildMatch({ shopId, start, end }),
        user: { $ne: null },
      },
    },
    {
      $group: {
        _id: "$user",
        orderCount: { $sum: 1 },
      },
    },
  ]);

  const totalCustomers = rows.length;
  const repeatCustomers = rows.filter((row) => row.orderCount > 1).length;
  return {
    totalCustomers,
    repeatCustomers,
    repeatRate: totalCustomers ? repeatCustomers / totalCustomers : 0,
  };
}

async function buildConversionFunnel({ shopId, start, end }) {
  const rows = await Order.aggregate([
    { $match: buildMatch({ shopId, start, end }) },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        paidOrders: {
          $sum: {
            $cond: [{ $eq: ["$paymentStatus", "SUCCESS"] }, 1, 0],
          },
        },
        shippedOrders: {
          $sum: { $cond: [{ $eq: ["$status", "SHIPPED"] }, 1, 0] },
        },
        deliveredOrders: {
          $sum: { $cond: [{ $eq: ["$status", "DELIVERED"] }, 1, 0] },
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0] },
        },
      },
    },
  ]);

  const totals = rows[0] || {
    totalOrders: 0,
    paidOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
  };
  const base = totals.totalOrders || 1;
  return [
    { stage: "PLACED", count: totals.totalOrders, rate: totals.totalOrders / base },
    { stage: "PAID", count: totals.paidOrders, rate: totals.paidOrders / base },
    { stage: "SHIPPED", count: totals.shippedOrders, rate: totals.shippedOrders / base },
    { stage: "DELIVERED", count: totals.deliveredOrders, rate: totals.deliveredOrders / base },
    { stage: "CANCELLED", count: totals.cancelledOrders, rate: totals.cancelledOrders / base },
  ];
}

async function buildWalletSummary({ shopId, start, end }) {
  let walletIds = null;
  if (shopId) {
    const wallet = await Wallet.findOne({ shopId }).select("_id").lean();
    if (!wallet?._id) {
      return { credits: 0, debits: 0, net: 0, transactionCount: 0 };
    }
    walletIds = [wallet._id];
  }

  const match = { createdAt: { $gte: start, $lte: end } };
  if (walletIds) {
    match.wallet = { $in: walletIds };
  }

  const rows = await WalletTransaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  const credits = rows.find((row) => row._id === "CREDIT")?.total || 0;
  const debits = rows.find((row) => row._id === "DEBIT")?.total || 0;
  const transactionCount = rows.reduce((sum, row) => sum + (row.count || 0), 0);

  return {
    credits,
    debits,
    net: credits - debits,
    transactionCount,
  };
}

async function buildShipmentSummary({ shopId, start, end }) {
  const match = buildMatch({ shopId, start, end });
  const rows = await Shipment.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const total = rows.reduce((sum, row) => sum + (row.count || 0), 0);
  const delivered = rows.find((row) => row._id === "DELIVERED")?.count || 0;
  const failed = rows.find((row) => row._id === "FAILED")?.count || 0;
  const successRate = total ? delivered / total : 0;

  return {
    total,
    delivered,
    failed,
    successRate,
    byStatus: rows.map((row) => ({ status: row._id, count: row.count || 0 })),
  };
}

async function buildInventorySnapshot({ shopId }) {
  if (!shopId) {
    const rows = await Inventory.find({}).select("stock reserved").lean();
    return summarizeInventory(rows);
  }
  const rows = await Inventory.find({ shopId }).select("stock reserved").lean();
  return summarizeInventory(rows);
}

function summarizeInventory(rows) {
  const totalSkus = rows.length;
  const totalStock = rows.reduce((sum, row) => sum + Number(row.stock || 0), 0);
  const totalReserved = rows.reduce((sum, row) => sum + Number(row.reserved || 0), 0);
  const lowStockCount = rows.filter((row) => Number(row.stock || 0) <= 5).length;
  const outOfStockCount = rows.filter((row) => Number(row.stock || 0) <= 0).length;
  return {
    totalSkus,
    totalStock,
    totalReserved,
    lowStockCount,
    outOfStockCount,
  };
}

async function upsertSnapshot({ metricType, shopId, dateKey, payload, metadata }) {
  return AnalyticsSnapshot.findOneAndUpdate(
    { metricType, shopId: shopId || null, dateKey },
    { metricType, shopId: shopId || null, dateKey, payload, metadata },
    { upsert: true, new: true }
  );
}

async function buildWarehouseSnapshots({ shopId, dateFrom, dateTo }) {
  const { start, end } = parseDateRange({ dateFrom, dateTo });
  const dateKey = new Date(end);

  const dailySales = await buildDailySales({ shopId, start, end });
  const trendAnalytics = await buildTrendAnalytics(dailySales);
  const merchantCohorts = await buildMerchantCohorts({ shopId, start, end });
  const categorySplit = await buildCategorySplit({ shopId, start, end });
  const channelSplit = await buildChannelSplit({ shopId, start, end });
  const topProducts = await buildTopProducts({ shopId, start, end });
  const customerRepeatRate = await buildCustomerRepeatRate({ shopId, start, end });
  const conversionFunnel = await buildConversionFunnel({ shopId, start, end });
  const walletSummary = await buildWalletSummary({ shopId, start, end });
  const shipmentSummary = await buildShipmentSummary({ shopId, start, end });
  const inventorySnapshot = await buildInventorySnapshot({ shopId });

  await Promise.all([
    upsertSnapshot({
      metricType: "DAILY_SALES",
      shopId,
      dateKey,
      payload: dailySales,
      metadata: { start, end },
    }),
    upsertSnapshot({
      metricType: "TREND_ANALYTICS",
      shopId,
      dateKey,
      payload: trendAnalytics,
      metadata: { start, end },
    }),
    upsertSnapshot({
      metricType: "MERCHANT_COHORTS",
      shopId,
      dateKey,
      payload: merchantCohorts,
      metadata: { start, end },
    }),
    upsertSnapshot({
      metricType: "CATEGORY_SPLIT",
      shopId,
      dateKey,
      payload: categorySplit,
      metadata: { start, end },
    }),
    upsertSnapshot({
      metricType: "CHANNEL_SPLIT",
      shopId,
      dateKey,
      payload: channelSplit,
      metadata: { start, end },
    }),
    upsertSnapshot({
      metricType: "TOP_PRODUCTS",
      shopId,
      dateKey,
      payload: topProducts,
      metadata: { start, end },
    }),
    upsertSnapshot({
      metricType: "CUSTOMER_REPEAT_RATE",
      shopId,
      dateKey,
      payload: customerRepeatRate,
      metadata: { start, end },
    }),
    upsertSnapshot({
      metricType: "CONVERSION_FUNNEL",
      shopId,
      dateKey,
      payload: conversionFunnel,
      metadata: { start, end },
    }),
    upsertSnapshot({
      metricType: "WALLET_SUMMARY",
      shopId,
      dateKey,
      payload: walletSummary,
      metadata: { start, end },
    }),
    upsertSnapshot({
      metricType: "SHIPMENT_STATUS",
      shopId,
      dateKey,
      payload: shipmentSummary,
      metadata: { start, end },
    }),
    upsertSnapshot({
      metricType: "INVENTORY_SNAPSHOT",
      shopId,
      dateKey,
      payload: inventorySnapshot,
      metadata: { start, end },
    }),
  ]);

  return {
    dailySales,
    trendAnalytics,
    merchantCohorts,
    categorySplit,
    channelSplit,
    topProducts,
    customerRepeatRate,
    conversionFunnel,
    walletSummary,
    shipmentSummary,
    inventorySnapshot,
  };
}

async function listSnapshots({ shopId, metricType, dateFrom, dateTo, limit }) {
  const query = {};
  if (metricType) query.metricType = metricType;
  if (shopId) query.shopId = shopId;
  if (dateFrom || dateTo) {
    query.dateKey = {};
    if (dateFrom) query.dateKey.$gte = new Date(dateFrom);
    if (dateTo) query.dateKey.$lte = new Date(dateTo);
  }

  const cursor = AnalyticsSnapshot.find(query).sort({ dateKey: -1 });
  if (limit) cursor.limit(limit);
  return cursor.lean();
}

async function getLatestSnapshot({ shopId, metricType, dateFrom, dateTo }) {
  const query = {
    metricType,
    shopId: shopId || null,
  };

  if (dateFrom || dateTo) {
    query.dateKey = {};
    if (dateFrom) query.dateKey.$gte = new Date(dateFrom);
    if (dateTo) query.dateKey.$lte = new Date(dateTo);
  }

  return AnalyticsSnapshot.findOne(query)
    .sort({ dateKey: -1 })
    .lean();
}

module.exports = {
  buildWarehouseSnapshots,
  listSnapshots,
  getLatestSnapshot,
};
