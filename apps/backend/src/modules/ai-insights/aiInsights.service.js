const Order = require("@/models/order.model");
const Product = require("@/models/product.model");

function toNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function computeStockoutDays({ stock, soldQty, days }) {
  const velocity = Number(days) > 0 ? Number(soldQty || 0) / Number(days) : 0;
  if (!Number.isFinite(velocity) || velocity <= 0) return null;
  return Number((Number(stock || 0) / velocity).toFixed(1));
}

function buildRiskLevel(estimatedDays) {
  if (!Number.isFinite(estimatedDays)) return "LOW";
  if (estimatedDays <= 3) return "CRITICAL";
  if (estimatedDays <= 7) return "HIGH";
  if (estimatedDays <= 14) return "MEDIUM";
  return "LOW";
}

function buildActionPriority(level) {
  const priorityMap = {
    CRITICAL: 100,
    HIGH: 80,
    MEDIUM: 60,
    LOW: 20,
  };
  return priorityMap[level] || 10;
}

async function getTopSellingProducts({ shopId, sinceDate, limit }) {
  const rows = await Order.aggregate([
    {
      $match: {
        shopId,
        status: { $in: ["CONFIRMED", "SHIPPED", "DELIVERED"] },
        createdAt: { $gte: sinceDate },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        soldQty: { $sum: "$items.quantity" },
        revenue: {
          $sum: { $multiply: ["$items.quantity", "$items.price"] },
        },
      },
    },
    { $sort: { soldQty: -1, revenue: -1 } },
    { $limit: Math.max(limit * 3, 10) },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $project: {
        _id: 0,
        productId: "$product._id",
        name: "$product.name",
        brand: "$product.brand",
        category: "$product.category",
        stock: "$product.stock",
        soldQty: 1,
        revenue: 1,
      },
    },
    { $limit: limit },
  ]);

  return rows;
}

async function getBusinessInsights({
  shopId,
  days = 7,
  limit = 5,
}) {
  const windowDays = Math.min(Math.max(Number(days) || 7, 1), 90);
  const itemLimit = Math.min(Math.max(Number(limit) || 5, 1), 20);
  const sinceDate = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const topProducts = await getTopSellingProducts({
    shopId,
    sinceDate,
    limit: itemLimit,
  });

  const stockRisk = topProducts
    .map(p => {
      const estimatedDays = computeStockoutDays({
        stock: p.stock,
        soldQty: p.soldQty,
        days: windowDays,
      });
      return {
        productId: p.productId,
        name: p.name,
        stock: Number(p.stock || 0),
        soldQty: Number(p.soldQty || 0),
        estimatedStockoutDays: estimatedDays,
      };
    })
    .filter(r => Number.isFinite(r.estimatedStockoutDays) && r.estimatedStockoutDays <= 14)
    .sort((a, b) => a.estimatedStockoutDays - b.estimatedStockoutDays)
    .slice(0, itemLimit);

  const primaryInsight = topProducts[0]
    ? `Top selling product in last ${windowDays} days: ${topProducts[0].name}`
    : "No sales signal found for selected period";

  return {
    periodDays: windowDays,
    generatedAt: new Date().toISOString(),
    summary: {
      primaryInsight,
      topProductCount: topProducts.length,
      stockRiskCount: stockRisk.length,
    },
    topProducts,
    stockRisk,
  };
}

function buildBusinessActions({
  periodDays,
  topProducts = [],
  stockRisk = [],
  maxActions = 10,
}) {
  const actions = [];

  for (const item of stockRisk) {
    const riskLevel = buildRiskLevel(item.estimatedStockoutDays);
    if (riskLevel === "LOW") continue;

    actions.push({
      type: "RESTOCK",
      priority: buildActionPriority(riskLevel),
      riskLevel,
      productId: item.productId,
      productName: item.name,
      message: `${item.name} may run out in ${item.estimatedStockoutDays} days. Plan replenishment.`,
      meta: {
        estimatedStockoutDays: item.estimatedStockoutDays,
        currentStock: item.stock,
        soldQty: item.soldQty,
      },
    });
  }

  for (const item of topProducts.slice(0, 3)) {
    if (!Number.isFinite(item.stock) || item.stock > 0) continue;

    actions.push({
      type: "PRICE_REVIEW",
      priority: 70,
      riskLevel: "HIGH",
      productId: item.productId,
      productName: item.name,
      message: `${item.name} is a top seller but currently out of stock. Review price and supply.`,
      meta: {
        soldQty: Number(item.soldQty || 0),
        revenue: Number(item.revenue || 0),
      },
    });
  }

  return actions
    .sort((a, b) => b.priority - a.priority)
    .slice(0, maxActions);
}

async function getBusinessActions({
  shopId,
  days = 7,
  limit = 5,
  maxActions = 10,
}) {
  const insights = await getBusinessInsights({
    shopId,
    days,
    limit,
  });

  const actions = buildBusinessActions({
    periodDays: insights.periodDays,
    topProducts: insights.topProducts,
    stockRisk: insights.stockRisk,
    maxActions,
  });

  return {
    periodDays: insights.periodDays,
    generatedAt: insights.generatedAt,
    summary: {
      actionCount: actions.length,
      primaryAction: actions[0]?.message || "No immediate action required",
    },
    actions,
    context: {
      topProducts: insights.topProducts.slice(0, 3),
    },
  };
}

module.exports = {
  getBusinessInsights,
  getBusinessActions,
  toNumber,
  _internals: {
    computeStockoutDays,
    buildBusinessActions,
    buildRiskLevel,
  },
};
