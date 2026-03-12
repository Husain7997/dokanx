const { forecastDemand } = require("./aiDemandForecast.service");
const { analyzePriceIntelligence } = require("./priceIntelligence.service");
const { getTrendingProducts } = require("./trendDetection.service");
const { recordIntelligenceMetric } = require("./intelligenceTelemetry.service");

async function generateMerchantRecommendations({
  shopId,
  products = [],
  searches = [],
  persistMetric = false,
}) {
  const startedAt = Date.now();
  const recommendations = [];

  for (const product of products.slice(0, 10)) {
    const demand = await forecastDemand({
      shopId,
      productId: product._id || product.productId,
      dailySales: product.dailySales || [],
      currentStock: product.stock || 0,
      leadTimeDays: product.leadTimeDays || 3,
      persistMetric: false,
    });
    if (demand.reorderWithinDays !== null && demand.reorderWithinDays <= 3) {
      recommendations.push({
        type: "REORDER",
        productId: product._id || product.productId,
        priority: "HIGH",
        message: demand.recommendation,
        confidence: demand.confidence,
      });
    }

    const pricing = await analyzePriceIntelligence({
      shopId,
      productId: product._id || product.productId,
      currentPrice: product.price || 0,
      competitorPrices: product.competitorPrices || [],
      recentSales: product.dailySales || [],
      stock: product.stock || 0,
      persistMetric: false,
    });
    if (pricing.suggestedAdjustmentPct !== 0) {
      recommendations.push({
        type: "PRICE",
        productId: product._id || product.productId,
        priority: "MEDIUM",
        message: pricing.recommendation,
        confidence: Number((1 - pricing.anomalyScore * 0.25).toFixed(2)),
      });
    }
  }

  const trends = await getTrendingProducts({
    shopId,
    products: products.map(product => ({
      _id: product._id || product.productId,
      name: product.name,
      salesVelocity: (product.dailySales || []).slice(-7).reduce((sum, value) => sum + Number(value || 0), 0),
    })),
    searches,
    persistMetric: false,
  });

  for (const trend of trends.trends.slice(0, 3)) {
    recommendations.push({
      type: "TREND",
      productId: trend.productId,
      priority: "MEDIUM",
      message: trend.insight,
      confidence: 0.83,
    });
  }

  const ordered = recommendations
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .slice(0, 15);

  const accuracy = ordered.length
    ? Number((ordered.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / ordered.length).toFixed(2))
    : 0.8;

  await recordIntelligenceMetric({
    tenantId: shopId,
    metricType: "MERCHANT_RECOMMENDATION",
    latencyMs: Date.now() - startedAt,
    accuracyScore: accuracy,
    metadata: { recommendationCount: ordered.length },
    persist: persistMetric,
  });

  return {
    shopId,
    generatedAt: new Date().toISOString(),
    recommendationAccuracy: accuracy,
    recommendations: ordered,
  };
}

module.exports = {
  generateMerchantRecommendations,
};
