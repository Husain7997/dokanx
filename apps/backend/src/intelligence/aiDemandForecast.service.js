const { recordIntelligenceMetric } = require("./intelligenceTelemetry.service");

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildDemandForecast({
  dailySales = [],
  currentStock = 0,
  leadTimeDays = 3,
  confidenceBase = 0.82,
}) {
  const safeSeries = dailySales.map(value => Math.max(toNumber(value, 0), 0));
  const avgDailyDemand = safeSeries.length
    ? safeSeries.reduce((sum, value) => sum + value, 0) / safeSeries.length
    : 0;
  const momentum =
    safeSeries.length >= 4
      ? (safeSeries.slice(-3).reduce((sum, value) => sum + value, 0) / 3) -
        (safeSeries.slice(0, 3).reduce((sum, value) => sum + value, 0) / 3)
      : 0;

  const forecastDailyDemand = Number(Math.max(avgDailyDemand + momentum * 0.15, 0).toFixed(2));
  const daysUntilStockout =
    forecastDailyDemand > 0 ? Number((Math.max(toNumber(currentStock, 0), 0) / forecastDailyDemand).toFixed(1)) : null;
  const reorderWithinDays =
    daysUntilStockout === null ? null : Math.max(0, Math.ceil(daysUntilStockout - toNumber(leadTimeDays, 3)));
  const recommendedReorderQty = forecastDailyDemand
    ? Math.max(0, Math.ceil(forecastDailyDemand * (toNumber(leadTimeDays, 3) + 7) - toNumber(currentStock, 0)))
    : 0;

  return {
    forecastDailyDemand,
    daysUntilStockout,
    reorderWithinDays,
    recommendedReorderQty,
    confidence: Number(
      Math.max(0.5, Math.min(0.98, confidenceBase - Math.abs(momentum) * 0.01 + Math.min(safeSeries.length / 30, 0.1)))
        .toFixed(2)
    ),
  };
}

async function forecastDemand({
  shopId,
  productId,
  dailySales = [],
  currentStock = 0,
  leadTimeDays = 3,
  persistMetric = false,
}) {
  const startedAt = Date.now();
  const forecast = buildDemandForecast({
    dailySales,
    currentStock,
    leadTimeDays,
  });

  await recordIntelligenceMetric({
    tenantId: shopId,
    metricType: "DEMAND_FORECAST",
    latencyMs: Date.now() - startedAt,
    accuracyScore: forecast.confidence,
    metadata: {
      productId: String(productId || ""),
      currentStock,
      leadTimeDays,
    },
    persist: persistMetric,
  });

  return {
    shopId,
    productId,
    generatedAt: new Date().toISOString(),
    ...forecast,
    recommendation: forecast.reorderWithinDays !== null
      ? `Restock product ${productId || ""} within ${forecast.reorderWithinDays} day(s)`
      : "Insufficient demand signal for reorder planning",
  };
}

module.exports = {
  forecastDemand,
  _internals: {
    buildDemandForecast,
  },
};
