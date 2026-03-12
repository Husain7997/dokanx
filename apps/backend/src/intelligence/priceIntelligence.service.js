const { recordIntelligenceMetric } = require("./intelligenceTelemetry.service");

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function analyzePricePosition({
  currentPrice = 0,
  competitorPrices = [],
  recentSales = [],
  stock = 0,
}) {
  const safeCurrent = toNumber(currentPrice, 0);
  const competitorAvg = competitorPrices.length
    ? competitorPrices.reduce((sum, value) => sum + toNumber(value, 0), 0) / competitorPrices.length
    : safeCurrent;
  const velocity = recentSales.length
    ? recentSales.reduce((sum, value) => sum + toNumber(value, 0), 0) / recentSales.length
    : 0;
  const gapPct = competitorAvg > 0 ? Number((((safeCurrent - competitorAvg) / competitorAvg) * 100).toFixed(2)) : 0;

  let suggestedAdjustmentPct = 0;
  let reason = "Price is within expected range";
  if (gapPct <= -8 && velocity > 2 && toNumber(stock, 0) < 15) {
    suggestedAdjustmentPct = 5;
    reason = "Price is materially below market while demand is strong";
  } else if (gapPct >= 10 && velocity < 1.5) {
    suggestedAdjustmentPct = -5;
    reason = "Price is above market while demand is soft";
  }

  return {
    competitorAvgPrice: Number(competitorAvg.toFixed(2)),
    anomalyScore: Number(Math.min(1, Math.abs(gapPct) / 25).toFixed(2)),
    suggestedAdjustmentPct,
    suggestedPrice: Number((safeCurrent * (1 + suggestedAdjustmentPct / 100)).toFixed(2)),
    reason,
  };
}

async function analyzePriceIntelligence({
  shopId,
  productId,
  currentPrice,
  competitorPrices = [],
  recentSales = [],
  stock = 0,
  persistMetric = false,
}) {
  const startedAt = Date.now();
  const analysis = analyzePricePosition({
    currentPrice,
    competitorPrices,
    recentSales,
    stock,
  });

  await recordIntelligenceMetric({
    tenantId: shopId,
    metricType: "PRICE_INTELLIGENCE",
    latencyMs: Date.now() - startedAt,
    accuracyScore: Number((1 - analysis.anomalyScore * 0.3).toFixed(2)),
    metadata: {
      productId: String(productId || ""),
      suggestedAdjustmentPct: analysis.suggestedAdjustmentPct,
    },
    persist: persistMetric,
  });

  return {
    shopId,
    productId,
    generatedAt: new Date().toISOString(),
    ...analysis,
    recommendation:
      analysis.suggestedAdjustmentPct === 0
        ? "Keep price stable"
        : `${analysis.suggestedAdjustmentPct > 0 ? "Increase" : "Decrease"} price by ${Math.abs(
            analysis.suggestedAdjustmentPct
          )}%`,
  };
}

module.exports = {
  analyzePriceIntelligence,
  _internals: {
    analyzePricePosition,
  },
};
