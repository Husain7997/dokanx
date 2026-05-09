const Product = require("../models/product.model");
const Order = require("../models/order.model");

function round(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function calculateReorder(product) {
  const avgDaily = Number(product.totalSold || 0) / 30;
  return Math.max(0, Math.ceil((avgDaily * 7) - Number(product.stock || 0)));
}

async function getLowStockProducts(merchantId) {
  return Product.find({
    shopId: merchantId,
    $expr: { $lte: ["$stock", "$minStock"] },
  })
    .sort({ stock: 1, updatedAt: -1 })
    .limit(50)
    .lean();
}

async function getDeadStock(merchantId) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return Product.find({
    shopId: merchantId,
    stock: { $gt: 0 },
    $or: [
      { lastSoldAt: { $lt: cutoff } },
      { lastSoldAt: null, createdAt: { $lt: cutoff } },
    ],
  })
    .sort({ lastSoldAt: 1, createdAt: 1 })
    .limit(50)
    .lean();
}

async function getTopSelling(merchantId) {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const rows = await Order.aggregate([
    {
      $match: {
        shopId: merchantId,
        createdAt: { $gte: since },
        status: { $nin: ["CANCELLED", "REFUNDED"] },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        quantitySold7d: { $sum: "$items.quantity" },
        orderCount7d: { $sum: 1 },
      },
    },
    { $sort: { quantitySold7d: -1 } },
    { $limit: 10 },
  ]);

  const productIds = rows.map((row) => row._id).filter(Boolean);
  const products = await Product.find({ _id: { $in: productIds }, shopId: merchantId }).lean();
  const byId = new Map(products.map((product) => [String(product._id), product]));

  return rows.map((row) => ({
    ...byId.get(String(row._id)),
    quantitySold7d: Number(row.quantitySold7d || 0),
    orderCount7d: Number(row.orderCount7d || 0),
  })).filter((row) => row._id);
}

function decorateProduct(product) {
  const avgDailySale = round(Number(product.totalSold || 0) / 30);
  const reorderQty = calculateReorder(product);
  const margin = Number(product.price || 0) - Number(product.costPrice || 0);
  const marginPct = Number(product.price || 0) > 0 ? round((margin / Number(product.price || 0)) * 100) : 0;
  return {
    ...product,
    avgDailySale,
    reorderQty,
    margin,
    marginPct,
    isLossRisk: Number(product.costPrice || 0) > 0 && Number(product.price || 0) < Number(product.costPrice || 0),
  };
}

async function getInventoryIntelligence(merchantId) {
  const [lowStock, deadStock, topSelling, products] = await Promise.all([
    getLowStockProducts(merchantId),
    getDeadStock(merchantId),
    getTopSelling(merchantId),
    Product.find({ shopId: merchantId }).sort({ updatedAt: -1 }).limit(200).lean(),
  ]);

  const reorder = products
    .map(decorateProduct)
    .filter((product) => product.reorderQty > 0 || Number(product.stock || 0) <= Number(product.minStock || 5))
    .sort((a, b) => b.reorderQty - a.reorderQty)
    .slice(0, 20);

  const lossRisk = products
    .map(decorateProduct)
    .filter((product) => product.isLossRisk)
    .slice(0, 20);

  return {
    summary: {
      lowStockCount: lowStock.length,
      deadStockCount: deadStock.length,
      topSellingCount: topSelling.length,
      reorderCount: reorder.length,
      lossRiskCount: lossRisk.length,
    },
    lowStock: lowStock.map(decorateProduct),
    deadStock: deadStock.map(decorateProduct),
    topSelling: topSelling.map(decorateProduct),
    reorder,
    lossRisk,
  };
}

module.exports = {
  calculateReorder,
  getInventoryIntelligence,
  getLowStockProducts,
  getDeadStock,
  getTopSelling,
};
