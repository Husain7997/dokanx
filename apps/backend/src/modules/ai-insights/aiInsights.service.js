const Order = require("@/models/order.model");
const Product = require("@/models/product.model");
const Payout = require("@/models/payout.model");
const Supplier = require("@/modules/supplier-marketplace/models/supplier.model");
const SupplierOffer = require("@/modules/supplier-marketplace/models/supplierOffer.model");
const BulkOrderRequest = require("@/modules/supplier-marketplace/models/bulkOrderRequest.model");
const CreditAccount = require("@/modules/credit/credit.account.model");

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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeForCompare(value) {
  return normalizeText(value).replace(/\s+/g, " ");
}

function computeDemandGap({
  stock = 0,
  dailyDemand = 0,
  leadTimeDays = 0,
  bufferDays = 3,
}) {
  const safeDailyDemand = Number(dailyDemand || 0);
  if (!Number.isFinite(safeDailyDemand) || safeDailyDemand <= 0) {
    return {
      stockCoverDays: null,
      reorderPointDays: Number(leadTimeDays || 0) + Number(bufferDays || 0),
      reorderQty: 0,
      targetCoverageDays: Number(leadTimeDays || 0) + Number(bufferDays || 0) + 7,
    };
  }

  const safeStock = Math.max(Number(stock || 0), 0);
  const reorderPointDays = Number(leadTimeDays || 0) + Number(bufferDays || 0);
  const stockCoverDays = Number((safeStock / safeDailyDemand).toFixed(1));
  const targetCoverageDays = clamp(reorderPointDays + 7, 7, 45);
  const targetQty = safeDailyDemand * targetCoverageDays;
  const reorderQty = Math.max(0, Math.ceil(targetQty - safeStock));

  return {
    stockCoverDays,
    reorderPointDays: Number(reorderPointDays.toFixed(1)),
    reorderQty,
    targetCoverageDays: Number(targetCoverageDays.toFixed(1)),
  };
}

function scoreSupplierForReorder({
  leadTimeDays = 0,
  wholesalePrice = 0,
  availableQty = 0,
  reliabilityScore = 50,
}) {
  const leadScore = Math.max(0, 100 - Number(leadTimeDays || 0) * 12);
  const priceScore = Math.max(0, 100 - Number(wholesalePrice || 0) / 5);
  const stockScore = Math.min(Number(availableQty || 0), 100);

  return Number(
    (
      Number(reliabilityScore || 0) * 0.45 +
      leadScore * 0.3 +
      priceScore * 0.15 +
      stockScore * 0.1
    ).toFixed(2)
  );
}

function buildMarginAwareRecommendation({
  productName = "",
  currentPrice = 0,
  estimatedCost = null,
  targetMarginPct = 18,
  competitorAvgPrice = null,
  demandTrendPct = 0,
  maxAdjustmentPct = 15,
}) {
  const safeCurrentPrice = Number(currentPrice || 0);
  const safeCost = Number(estimatedCost);
  const safeTargetMargin = clamp(Number(targetMarginPct || 18), 5, 60);
  const safeMaxAdjustment = clamp(Number(maxAdjustmentPct || 15), 1, 30);
  const safeCompetitorAvg = Number(competitorAvgPrice);
  const safeDemandTrendPct = Number(demandTrendPct || 0);

  if (!Number.isFinite(safeCurrentPrice) || safeCurrentPrice <= 0) {
    return {
      productName,
      currentPrice: safeCurrentPrice,
      suggestedPrice: safeCurrentPrice,
      adjustmentPct: 0,
      confidence: "LOW",
      reason: "Invalid current price",
      diagnostics: {},
    };
  }

  const floorByMargin = Number.isFinite(safeCost) && safeCost > 0
    ? Number((safeCost / (1 - safeTargetMargin / 100)).toFixed(2))
    : null;

  let basePrice = safeCurrentPrice;
  const reasonParts = [];

  if (Number.isFinite(floorByMargin) && floorByMargin > 0) {
    basePrice = Math.max(basePrice, floorByMargin);
    reasonParts.push(`Margin floor at ${safeTargetMargin}%`);
  }

  if (Number.isFinite(safeCompetitorAvg) && safeCompetitorAvg > 0) {
    const blended = basePrice * 0.6 + safeCompetitorAvg * 0.4;
    basePrice = Number(blended.toFixed(2));
    reasonParts.push("Competitor benchmark blended");
  }

  // Demand trend acts as elasticity proxy.
  // Strong growth: tolerate higher price. Strong decline: prefer a softer price.
  if (safeDemandTrendPct >= 20) {
    basePrice = Number((basePrice * 1.03).toFixed(2));
    reasonParts.push("Demand trend strong (+)");
  } else if (safeDemandTrendPct <= -20) {
    basePrice = Number((basePrice * 0.97).toFixed(2));
    reasonParts.push("Demand trend weak (-)");
  }

  const rawAdjustmentPct = ((basePrice - safeCurrentPrice) / safeCurrentPrice) * 100;
  const adjustmentPct = Number(clamp(rawAdjustmentPct, -safeMaxAdjustment, safeMaxAdjustment).toFixed(2));
  const suggestedPrice = Number((safeCurrentPrice * (1 + adjustmentPct / 100)).toFixed(2));

  const confidence = Number.isFinite(floorByMargin) && Number.isFinite(safeCompetitorAvg)
    ? "HIGH"
    : Number.isFinite(floorByMargin) || Number.isFinite(safeCompetitorAvg)
      ? "MEDIUM"
      : "LOW";

  return {
    productName,
    currentPrice: safeCurrentPrice,
    suggestedPrice,
    adjustmentPct,
    confidence,
    reason: reasonParts.length ? reasonParts.join(" | ") : "Insufficient market signal; keep stable",
    diagnostics: {
      estimatedCost: Number.isFinite(safeCost) ? safeCost : null,
      floorByMargin,
      targetMarginPct: safeTargetMargin,
      competitorAvgPrice: Number.isFinite(safeCompetitorAvg) ? Number(safeCompetitorAvg.toFixed(2)) : null,
      demandTrendPct: Number(safeDemandTrendPct.toFixed(2)),
    },
  };
}

function toSeverity(score) {
  if (score >= 75) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

function buildFraudScore({
  payoutFailureRate = 0,
  payoutAmountSpikePct = 0,
  highRiskCreditRatio = 0,
  overdueExposure = 0,
}) {
  const payoutFailureComponent = Math.min(Number(payoutFailureRate || 0) * 0.45, 45);
  const spikeComponent = Math.min(Math.max(Number(payoutAmountSpikePct || 0), 0) * 0.2, 25);
  const creditRiskComponent = Math.min(Number(highRiskCreditRatio || 0) * 0.25, 20);
  const overdueExposureComponent = Math.min(Math.max(Number(overdueExposure || 0), 0) * 0.1, 10);
  return Number(
    (
      payoutFailureComponent +
      spikeComponent +
      creditRiskComponent +
      overdueExposureComponent
    ).toFixed(2)
  );
}

function buildFraudMessage({
  payoutFailureRate = 0,
  payoutAmountSpikePct = 0,
  highRiskCreditRatio = 0,
  overdueExposure = 0,
}) {
  const parts = [];
  if (Number(payoutFailureRate) >= 20) {
    parts.push(`Payout failure rate is ${Number(payoutFailureRate).toFixed(1)}%`);
  }
  if (Number(payoutAmountSpikePct) >= 30) {
    parts.push(`Payout amount spike is ${Number(payoutAmountSpikePct).toFixed(1)}%`);
  }
  if (Number(highRiskCreditRatio) >= 35) {
    parts.push(`High-risk credit exposure is ${Number(highRiskCreditRatio).toFixed(1)}%`);
  }
  if (Number(overdueExposure) >= 50) {
    parts.push(`Overdue credit exposure is ${Number(overdueExposure).toFixed(1)}%`);
  }
  return parts.length ? parts.join(" | ") : "No major payout/credit anomaly detected";
}

function buildSupplierReliabilityMap(rows = []) {
  const map = new Map();
  for (const row of rows) {
    const totalOrders = Number(row.totalOrders || 0);
    const fulfilledOrders = Number(row.fulfilledOrders || 0);
    const acceptedOrders = Number(row.acceptedOrders || 0);
    const fulfillmentRate = totalOrders > 0 ? (fulfilledOrders / totalOrders) * 100 : 0;
    const acceptanceRate = totalOrders > 0 ? (acceptedOrders / totalOrders) * 100 : 0;
    const reliabilityScore = Number(
      (fulfillmentRate * 0.6 + acceptanceRate * 0.4).toFixed(2)
    );

    map.set(String(row._id), {
      totalOrders,
      fulfillmentRate: Number(fulfillmentRate.toFixed(2)),
      acceptanceRate: Number(acceptanceRate.toFixed(2)),
      reliabilityScore,
    });
  }
  return map;
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

async function getPeriodMetrics({ shopId, fromDate, toDate }) {
  const rows = await Order.aggregate([
    {
      $match: {
        shopId,
        status: { $in: ["CONFIRMED", "SHIPPED", "DELIVERED"] },
        createdAt: { $gte: fromDate, $lt: toDate },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: null,
        orderCount: { $addToSet: "$_id" },
        revenue: {
          $sum: { $multiply: ["$items.quantity", "$items.price"] },
        },
        soldQty: { $sum: "$items.quantity" },
      },
    },
    {
      $project: {
        _id: 0,
        orderCount: { $size: "$orderCount" },
        revenue: 1,
        soldQty: 1,
      },
    },
  ]);

  const metric = rows[0] || { orderCount: 0, revenue: 0, soldQty: 0 };
  return {
    orderCount: Number(metric.orderCount || 0),
    revenue: Number(metric.revenue || 0),
    soldQty: Number(metric.soldQty || 0),
  };
}

function pctChange(current, previous) {
  const c = Number(current || 0);
  const p = Number(previous || 0);
  if (p === 0) {
    if (c === 0) return 0;
    return 100;
  }
  return Number((((c - p) / p) * 100).toFixed(2));
}

function buildPricingRecommendation({
  name,
  currentPrice,
  soldQty,
  stock,
  days,
  maxAdjustmentPct = 15,
}) {
  const safePrice = Number(currentPrice || 0);
  if (!Number.isFinite(safePrice) || safePrice <= 0) {
    return {
      productName: name || "",
      currentPrice: safePrice,
      suggestedPrice: safePrice,
      adjustmentPct: 0,
      reason: "No price signal available",
      confidence: "LOW",
    };
  }

  const dailyDemand = Number(days) > 0 ? Number(soldQty || 0) / Number(days) : 0;
  const stockDays = dailyDemand > 0 ? Number(stock || 0) / dailyDemand : null;

  let adjustmentPct = 0;
  let reason = "Price stable for current demand";
  let confidence = "MEDIUM";

  if (Number.isFinite(stockDays) && stockDays <= 3 && dailyDemand >= 2) {
    adjustmentPct = clamp(8, -maxAdjustmentPct, maxAdjustmentPct);
    reason = "High demand with very low stock coverage";
    confidence = "HIGH";
  } else if (Number.isFinite(stockDays) && stockDays <= 7 && dailyDemand >= 1) {
    adjustmentPct = clamp(4, -maxAdjustmentPct, maxAdjustmentPct);
    reason = "Demand is healthy and stock is tightening";
  } else if (Number.isFinite(stockDays) && stockDays >= 45 && dailyDemand <= 0.5) {
    adjustmentPct = clamp(-8, -maxAdjustmentPct, maxAdjustmentPct);
    reason = "Slow demand with high stock holding";
    confidence = "HIGH";
  } else if (Number.isFinite(stockDays) && stockDays >= 30 && dailyDemand <= 1) {
    adjustmentPct = clamp(-4, -maxAdjustmentPct, maxAdjustmentPct);
    reason = "Stock cover is high compared to sales velocity";
  }

  const suggestedPrice = Number((safePrice * (1 + adjustmentPct / 100)).toFixed(2));

  return {
    productName: name || "",
    currentPrice: safePrice,
    suggestedPrice,
    adjustmentPct,
    reason,
    confidence,
    diagnostics: {
      soldQty: Number(soldQty || 0),
      stock: Number(stock || 0),
      stockDays: Number.isFinite(stockDays) ? Number(stockDays.toFixed(1)) : null,
      dailyDemand: Number(dailyDemand.toFixed(2)),
    },
  };
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

async function getBusinessTrends({
  shopId,
  days = 7,
  limit = 5,
}) {
  const windowDays = Math.min(Math.max(Number(days) || 7, 1), 90);
  const itemLimit = Math.min(Math.max(Number(limit) || 5, 1), 20);

  const now = new Date();
  const currentFrom = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const previousFrom = new Date(currentFrom.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const [currentMetrics, previousMetrics] = await Promise.all([
    getPeriodMetrics({ shopId, fromDate: currentFrom, toDate: now }),
    getPeriodMetrics({ shopId, fromDate: previousFrom, toDate: currentFrom }),
  ]);

  const [currentTop, previousTop] = await Promise.all([
    getTopSellingProducts({ shopId, sinceDate: currentFrom, limit: itemLimit }),
    getTopSellingProducts({ shopId, sinceDate: previousFrom, limit: itemLimit * 3 }),
  ]);

  const previousMap = new Map(previousTop.map(p => [String(p.productId), p]));

  const topMovers = currentTop
    .map(p => {
      const prev = previousMap.get(String(p.productId));
      const prevSold = Number(prev?.soldQty || 0);
      const currSold = Number(p.soldQty || 0);
      return {
        productId: p.productId,
        name: p.name,
        currentSoldQty: currSold,
        previousSoldQty: prevSold,
        soldQtyChangePct: pctChange(currSold, prevSold),
      };
    })
    .sort((a, b) => b.soldQtyChangePct - a.soldQtyChangePct)
    .slice(0, itemLimit);

  const trendSummary = {
    orderCountChangePct: pctChange(currentMetrics.orderCount, previousMetrics.orderCount),
    revenueChangePct: pctChange(currentMetrics.revenue, previousMetrics.revenue),
    soldQtyChangePct: pctChange(currentMetrics.soldQty, previousMetrics.soldQty),
  };

  return {
    periodDays: windowDays,
    generatedAt: now.toISOString(),
    current: currentMetrics,
    previous: previousMetrics,
    trendSummary,
    topMovers,
  };
}

async function getPricingRecommendations({
  shopId,
  days = 14,
  limit = 10,
  maxAdjustmentPct = 15,
}) {
  const windowDays = Math.min(Math.max(Number(days) || 14, 1), 90);
  const itemLimit = Math.min(Math.max(Number(limit) || 10, 1), 30);
  const adjustmentCap = Math.min(Math.max(Number(maxAdjustmentPct) || 15, 1), 30);
  const sinceDate = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const topProducts = await getTopSellingProducts({
    shopId,
    sinceDate,
    limit: itemLimit,
  });

  const recommendations = topProducts
    .map(p =>
      buildPricingRecommendation({
        name: p.name,
        currentPrice: p.revenue > 0 && p.soldQty > 0 ? Number((p.revenue / p.soldQty).toFixed(2)) : null,
        soldQty: p.soldQty,
        stock: p.stock,
        days: windowDays,
        maxAdjustmentPct: adjustmentCap,
      })
    )
    .sort((a, b) => Math.abs(b.adjustmentPct) - Math.abs(a.adjustmentPct))
    .slice(0, itemLimit);

  return {
    periodDays: windowDays,
    generatedAt: new Date().toISOString(),
    summary: {
      recommendationCount: recommendations.length,
      maxAdjustmentPct: adjustmentCap,
    },
    recommendations,
  };
}

async function getMarginAwarePricingAdvisory({
  shopId,
  days = 28,
  limit = 10,
  targetMarginPct = 18,
  maxAdjustmentPct = 15,
}) {
  const windowDays = Math.min(Math.max(Number(days) || 28, 7), 120);
  const itemLimit = Math.min(Math.max(Number(limit) || 10, 1), 30);
  const marginTarget = clamp(Number(targetMarginPct) || 18, 5, 60);
  const adjustmentCap = clamp(Number(maxAdjustmentPct) || 15, 1, 30);

  const now = new Date();
  const currentFrom = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const previousFrom = new Date(currentFrom.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const [currentTop, previousTop, localProducts, offers, competitorProducts] = await Promise.all([
    getTopSellingProducts({ shopId, sinceDate: currentFrom, limit: itemLimit * 3 }),
    getTopSellingProducts({ shopId, sinceDate: previousFrom, limit: itemLimit * 5 }),
    Product.find({ shopId, isActive: true })
      .select("_id name brand category barcode price stock")
      .limit(itemLimit * 10)
      .lean(),
    SupplierOffer.find({ isActive: true })
      .select("title productName brand category barcode wholesalePrice")
      .lean(),
    Product.find({ shopId: { $ne: shopId }, isActive: true })
      .select("_id name brand category barcode price")
      .limit(2000)
      .lean(),
  ]);

  const topIdSet = new Set(currentTop.map(row => String(row.productId)));
  const localById = new Map(localProducts.map(p => [String(p._id), p]));
  const previousMap = new Map(previousTop.map(row => [String(row.productId), Number(row.soldQty || 0)]));

  const advisories = [];

  for (const currentRow of currentTop) {
    const productId = String(currentRow.productId);
    if (!topIdSet.has(productId)) continue;

    const product = localById.get(productId);
    if (!product) continue;

    const productName = normalizeForCompare(product.name);
    const productBrand = normalizeForCompare(product.brand);
    const productCategory = normalizeForCompare(product.category);
    const productBarcode = normalizeForCompare(product.barcode);

    const matchedOffers = offers.filter(offer => {
      const offerBarcode = normalizeForCompare(offer.barcode);
      if (productBarcode && offerBarcode && productBarcode === offerBarcode) return true;

      const offerBrand = normalizeForCompare(offer.brand);
      const offerCategory = normalizeForCompare(offer.category);
      const offerName = normalizeForCompare(offer.productName || offer.title);

      if (productBrand && offerBrand && productBrand === offerBrand) return true;
      if (productCategory && offerCategory && productCategory === offerCategory && productBrand && offerBrand === productBrand) {
        return true;
      }
      return Boolean(productName && offerName && (offerName.includes(productName) || productName.includes(offerName)));
    });

    const estimatedCost = matchedOffers.length
      ? Math.min(...matchedOffers.map(o => Number(o.wholesalePrice || 0)).filter(n => Number.isFinite(n) && n > 0))
      : null;

    const matchedCompetitors = competitorProducts.filter(cp => {
      const cpBarcode = normalizeForCompare(cp.barcode);
      if (productBarcode && cpBarcode && productBarcode === cpBarcode) return true;

      const cpBrand = normalizeForCompare(cp.brand);
      const cpCategory = normalizeForCompare(cp.category);
      const cpName = normalizeForCompare(cp.name);

      if (productBrand && cpBrand && productBrand === cpBrand && productCategory && cpCategory === productCategory) {
        return true;
      }
      return Boolean(productName && cpName && (cpName.includes(productName) || productName.includes(cpName)));
    });

    const competitorPrices = matchedCompetitors
      .map(cp => Number(cp.price || 0))
      .filter(p => Number.isFinite(p) && p > 0);
    const competitorAvgPrice = competitorPrices.length
      ? competitorPrices.reduce((sum, val) => sum + val, 0) / competitorPrices.length
      : null;

    const currentSold = Number(currentRow.soldQty || 0);
    const previousSold = Number(previousMap.get(productId) || 0);
    const demandTrendPct = pctChange(currentSold, previousSold);

    const advisory = buildMarginAwareRecommendation({
      productName: product.name,
      currentPrice: Number(product.price || 0),
      estimatedCost,
      targetMarginPct: marginTarget,
      competitorAvgPrice,
      demandTrendPct,
      maxAdjustmentPct: adjustmentCap,
    });

    advisories.push({
      productId: product._id,
      ...advisory,
    });
  }

  const data = advisories
    .sort((a, b) => Math.abs(b.adjustmentPct) - Math.abs(a.adjustmentPct))
    .slice(0, itemLimit);

  return {
    periodDays: windowDays,
    generatedAt: new Date().toISOString(),
    summary: {
      recommendationCount: data.length,
      targetMarginPct: marginTarget,
      maxAdjustmentPct: adjustmentCap,
    },
    advisories: data,
  };
}

async function getDemandAwareReorderSuggestions({
  shopId,
  days = 14,
  limit = 10,
  supplierCandidates = 3,
}) {
  const windowDays = Math.min(Math.max(Number(days) || 14, 7), 90);
  const itemLimit = Math.min(Math.max(Number(limit) || 10, 1), 30);
  const maxSuppliers = Math.min(Math.max(Number(supplierCandidates) || 3, 1), 5);
  const sinceDate = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const soldRows = await Order.aggregate([
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
      },
    },
    { $sort: { soldQty: -1 } },
    { $limit: itemLimit * 5 },
  ]);

  if (!soldRows.length) {
    return {
      periodDays: windowDays,
      generatedAt: new Date().toISOString(),
      summary: {
        suggestionCount: 0,
        message: "No demand signal found for selected period",
      },
      suggestions: [],
    };
  }

  const productIds = soldRows.map(r => r._id);
  const soldMap = new Map(soldRows.map(r => [String(r._id), Number(r.soldQty || 0)]));

  const products = await Product.find({
    _id: { $in: productIds },
    shopId,
    isActive: true,
  })
    .select("_id name brand category barcode stock")
    .lean();

  if (!products.length) {
    return {
      periodDays: windowDays,
      generatedAt: new Date().toISOString(),
      summary: {
        suggestionCount: 0,
        message: "No active product matched demand window",
      },
      suggestions: [],
    };
  }

  const offers = await SupplierOffer.find({ isActive: true })
    .select(
      "_id supplierId title productName brand category barcode wholesalePrice minOrderQty availableQty leadTimeDays"
    )
    .lean();

  const supplierIdMap = new Map();
  for (const offer of offers) {
    if (!offer?.supplierId) continue;
    const key = String(offer.supplierId);
    if (!supplierIdMap.has(key)) supplierIdMap.set(key, offer.supplierId);
  }
  const supplierIds = [...supplierIdMap.values()];
  const [supplierRows, reliabilityRows] = await Promise.all([
    Supplier.find({
      _id: { $in: supplierIds },
      isActive: true,
    })
      .select("_id name isVerified ratingAverage")
      .lean(),
    BulkOrderRequest.aggregate([
      {
        $match: {
          supplierId: { $in: supplierIds },
          createdAt: { $gte: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: "$supplierId",
          totalOrders: { $sum: 1 },
          fulfilledOrders: {
            $sum: { $cond: [{ $eq: ["$status", "FULFILLED"] }, 1, 0] },
          },
          acceptedOrders: {
            $sum: { $cond: [{ $in: ["$status", ["ACCEPTED", "FULFILLED"]] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  const supplierMap = new Map(supplierRows.map(s => [String(s._id), s]));
  const reliabilityMap = buildSupplierReliabilityMap(reliabilityRows);

  const suggestions = [];

  for (const product of products) {
    const productName = normalizeText(product.name);
    const brand = normalizeText(product.brand);
    const category = normalizeText(product.category);
    const barcode = normalizeText(product.barcode);

    const matchedOffers = offers.filter(offer => {
      if (!supplierMap.has(String(offer.supplierId))) return false;
      if (barcode && normalizeText(offer.barcode) === barcode) return true;

      const offerName = normalizeText(offer.productName || offer.title);
      const offerBrand = normalizeText(offer.brand);
      const offerCategory = normalizeText(offer.category);

      if (brand && offerBrand && brand === offerBrand) return true;
      if (category && offerCategory && category === offerCategory) return true;
      if (productName && offerName && (offerName.includes(productName) || productName.includes(offerName))) {
        return true;
      }
      return false;
    });

    if (!matchedOffers.length) continue;

    const soldQty = Number(soldMap.get(String(product._id)) || 0);
    const dailyDemand = Number((soldQty / windowDays).toFixed(2));
    if (!Number.isFinite(dailyDemand) || dailyDemand <= 0) continue;

    const minLeadTime = matchedOffers.reduce(
      (min, offer) => Math.min(min, Number(offer.leadTimeDays || 0)),
      Number.POSITIVE_INFINITY
    );

    const demandGap = computeDemandGap({
      stock: product.stock,
      dailyDemand,
      leadTimeDays: Number.isFinite(minLeadTime) ? minLeadTime : 3,
      bufferDays: 3,
    });

    if (!Number.isFinite(demandGap.stockCoverDays) || demandGap.stockCoverDays > demandGap.reorderPointDays) {
      continue;
    }

    const rankedSuppliers = matchedOffers
      .map(offer => {
        const supplierId = String(offer.supplierId);
        const supplier = supplierMap.get(supplierId);
        const reliability = reliabilityMap.get(supplierId) || {
          reliabilityScore: 50,
          fulfillmentRate: 0,
          acceptanceRate: 0,
          totalOrders: 0,
        };

        return {
          supplierId: offer.supplierId,
          supplierName: supplier?.name || "Supplier",
          offerId: offer._id,
          offerTitle: offer.title,
          wholesalePrice: Number(offer.wholesalePrice || 0),
          minOrderQty: Number(offer.minOrderQty || 1),
          availableQty: Number(offer.availableQty || 0),
          leadTimeDays: Number(offer.leadTimeDays || 0),
          reliabilityScore: Number(reliability.reliabilityScore || 50),
          fulfillmentRate: Number(reliability.fulfillmentRate || 0),
          acceptanceRate: Number(reliability.acceptanceRate || 0),
          reliabilityOrderCount: Number(reliability.totalOrders || 0),
          score: scoreSupplierForReorder({
            leadTimeDays: offer.leadTimeDays,
            wholesalePrice: offer.wholesalePrice,
            availableQty: offer.availableQty,
            reliabilityScore: reliability.reliabilityScore,
          }),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuppliers);

    if (!rankedSuppliers.length) continue;

    const preferredLead = rankedSuppliers[0].leadTimeDays;
    const finalGap = computeDemandGap({
      stock: product.stock,
      dailyDemand,
      leadTimeDays: preferredLead,
      bufferDays: 3,
    });

    const minOrderConstraint = rankedSuppliers[0].minOrderQty || 1;
    const suggestedQty = Math.max(finalGap.reorderQty, minOrderConstraint);

    suggestions.push({
      productId: product._id,
      productName: product.name,
      brand: product.brand || "",
      category: product.category || "",
      currentStock: Number(product.stock || 0),
      soldQty,
      dailyDemand,
      stockCoverDays: finalGap.stockCoverDays,
      reorderPointDays: finalGap.reorderPointDays,
      targetCoverageDays: finalGap.targetCoverageDays,
      suggestedOrderQty: suggestedQty,
      preferredSuppliers: rankedSuppliers,
      reason: `Demand at ${dailyDemand}/day with stock cover ${finalGap.stockCoverDays} days is below reorder point ${finalGap.reorderPointDays} days`,
    });
  }

  const ordered = suggestions
    .sort((a, b) => (a.stockCoverDays || 999) - (b.stockCoverDays || 999))
    .slice(0, itemLimit);

  return {
    periodDays: windowDays,
    generatedAt: new Date().toISOString(),
    summary: {
      suggestionCount: ordered.length,
      message: ordered.length
        ? `Generated ${ordered.length} reorder suggestion(s)`
        : "No low-cover products found after supplier lead-time filtering",
    },
    suggestions: ordered,
  };
}

async function getFraudAnomalyAlerts({
  shopId,
  days = 30,
  limit = 10,
}) {
  const windowDays = Math.min(Math.max(Number(days) || 30, 7), 120);
  const itemLimit = Math.min(Math.max(Number(limit) || 10, 1), 20);
  const now = new Date();
  const currentFrom = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const previousFrom = new Date(currentFrom.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const [currentPayouts, previousPayouts, creditAccounts] = await Promise.all([
    Payout.find({
      shopId,
      createdAt: { $gte: currentFrom, $lt: now },
    })
      .select("amount status createdAt")
      .lean(),
    Payout.find({
      shopId,
      createdAt: { $gte: previousFrom, $lt: currentFrom },
    })
      .select("amount status createdAt")
      .lean(),
    CreditAccount.find({
      shop: shopId,
    })
      .select("riskLevel overdueDays outstandingBalance creditLimit status")
      .lean(),
  ]);

  const currentTotalPayoutAmount = currentPayouts.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const previousTotalPayoutAmount = previousPayouts.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const currentFailed = currentPayouts.filter(p => p.status === "FAILED").length;
  const currentPayoutFailureRate = currentPayouts.length
    ? Number(((currentFailed / currentPayouts.length) * 100).toFixed(2))
    : 0;
  const payoutAmountSpikePct = pctChange(currentTotalPayoutAmount, previousTotalPayoutAmount);

  const highRiskAccounts = creditAccounts.filter(a => a.riskLevel === "HIGH").length;
  const overdueAccounts = creditAccounts.filter(a => Number(a.overdueDays || 0) > 15).length;
  const creditAccountCount = creditAccounts.length;
  const highRiskCreditRatio = creditAccountCount
    ? Number(((highRiskAccounts / creditAccountCount) * 100).toFixed(2))
    : 0;
  const overdueExposure = creditAccountCount
    ? Number(((overdueAccounts / creditAccountCount) * 100).toFixed(2))
    : 0;

  const fraudScore = buildFraudScore({
    payoutFailureRate: currentPayoutFailureRate,
    payoutAmountSpikePct,
    highRiskCreditRatio,
    overdueExposure,
  });
  const severity = toSeverity(fraudScore);

  const alerts = [
    {
      type: "PAYOUT_FAILURE_SPIKE",
      score: Number((Math.min(currentPayoutFailureRate * 1.2, 100)).toFixed(2)),
      severity: toSeverity(currentPayoutFailureRate * 1.2),
      message: `Current payout failure rate: ${currentPayoutFailureRate}%`,
      metrics: {
        periodDays: windowDays,
        currentPayoutCount: currentPayouts.length,
        currentFailedPayoutCount: currentFailed,
        payoutFailureRate: currentPayoutFailureRate,
      },
    },
    {
      type: "PAYOUT_AMOUNT_ANOMALY",
      score: Number((Math.max(payoutAmountSpikePct, 0)).toFixed(2)),
      severity: toSeverity(Math.max(payoutAmountSpikePct, 0)),
      message: `Payout amount change vs previous window: ${payoutAmountSpikePct}%`,
      metrics: {
        periodDays: windowDays,
        currentTotalPayoutAmount: Number(currentTotalPayoutAmount.toFixed(2)),
        previousTotalPayoutAmount: Number(previousTotalPayoutAmount.toFixed(2)),
        payoutAmountSpikePct,
      },
    },
    {
      type: "CREDIT_RISK_EXPOSURE",
      score: Number((highRiskCreditRatio * 1.1).toFixed(2)),
      severity: toSeverity(highRiskCreditRatio * 1.1),
      message: `High-risk credit accounts: ${highRiskCreditRatio}%`,
      metrics: {
        creditAccountCount,
        highRiskAccounts,
        highRiskCreditRatio,
        overdueExposure,
      },
    },
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, itemLimit);

  return {
    periodDays: windowDays,
    generatedAt: now.toISOString(),
    summary: {
      fraudScore,
      severity,
      message: buildFraudMessage({
        payoutFailureRate: currentPayoutFailureRate,
        payoutAmountSpikePct,
        highRiskCreditRatio,
        overdueExposure,
      }),
    },
    alerts,
    signals: {
      payout: {
        currentPayoutCount: currentPayouts.length,
        currentFailedPayoutCount: currentFailed,
        currentPayoutFailureRate,
        currentTotalPayoutAmount: Number(currentTotalPayoutAmount.toFixed(2)),
        previousTotalPayoutAmount: Number(previousTotalPayoutAmount.toFixed(2)),
        payoutAmountSpikePct,
      },
      credit: {
        creditAccountCount,
        highRiskAccounts,
        highRiskCreditRatio,
        overdueAccounts,
        overdueExposure,
      },
    },
  };
}

module.exports = {
  getBusinessInsights,
  getBusinessActions,
  getBusinessTrends,
  getPricingRecommendations,
  getMarginAwarePricingAdvisory,
  getDemandAwareReorderSuggestions,
  getFraudAnomalyAlerts,
  toNumber,
  _internals: {
    computeStockoutDays,
    buildBusinessActions,
    buildRiskLevel,
    pctChange,
    buildPricingRecommendation,
    buildMarginAwareRecommendation,
    computeDemandGap,
    scoreSupplierForReorder,
    buildSupplierReliabilityMap,
    buildFraudScore,
    buildFraudMessage,
    toSeverity,
  },
};
