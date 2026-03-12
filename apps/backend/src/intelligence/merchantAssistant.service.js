const { forecastDemand } = require("./aiDemandForecast.service");
const { analyzePriceIntelligence } = require("./priceIntelligence.service");
const { generateMerchantRecommendations } = require("./merchantRecommendation.service");
const { recordIntelligenceMetric } = require("./intelligenceTelemetry.service");

async function generateMerchantAssistantAdvice({
  shopId,
  sales = { currentWeek: 0, previousWeek: 0 },
  products = [],
  searches = [],
  persistMetric = false,
}) {
  const startedAt = Date.now();
  const currentWeek = Number(sales.currentWeek || 0);
  const previousWeek = Number(sales.previousWeek || 0);
  const salesDropPct =
    previousWeek > 0 ? Number((((currentWeek - previousWeek) / previousWeek) * 100).toFixed(2)) : 0;

  const recommendations = await generateMerchantRecommendations({
    shopId,
    products,
    searches,
    persistMetric: false,
  });

  const advice = [];
  if (salesDropPct <= -15) {
    advice.push({
      type: "SALES",
      message: `Your sales dropped ${Math.abs(salesDropPct)}% this week.`,
      confidence: 0.88,
    });
  }

  for (const product of products.slice(0, 3)) {
    const demand = await forecastDemand({
      shopId,
      productId: product._id || product.productId,
      dailySales: product.dailySales || [],
      currentStock: product.stock || 0,
      leadTimeDays: product.leadTimeDays || 3,
      persistMetric: false,
    });
    if (demand.reorderWithinDays !== null && demand.reorderWithinDays <= 3) {
      advice.push({
        type: "INVENTORY",
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
      advice.push({
        type: "PRICING",
        message: `${pricing.recommendation}. ${pricing.reason}`,
        confidence: Number((1 - pricing.anomalyScore * 0.2).toFixed(2)),
      });
    }
  }

  const latencyMs = Date.now() - startedAt;
  const recommendationAccuracy = recommendations.recommendationAccuracy || 0.8;
  await recordIntelligenceMetric({
    tenantId: shopId,
    metricType: "MERCHANT_ASSISTANT",
    latencyMs,
    accuracyScore: recommendationAccuracy,
    metadata: { adviceCount: advice.length, recommendationCount: recommendations.recommendations.length },
    persist: persistMetric,
  });

  return {
    shopId,
    generatedAt: new Date().toISOString(),
    recommendationAccuracy,
    advice,
    recommendations: recommendations.recommendations,
  };
}

module.exports = {
  generateMerchantAssistantAdvice,
};
