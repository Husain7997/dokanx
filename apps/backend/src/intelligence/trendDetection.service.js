const { recordIntelligenceMetric } = require("./intelligenceTelemetry.service");

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function detectTrends({ products = [], searches = [], region = "GLOBAL" }) {
  const searchBoost = searches.reduce((acc, item) => {
    const key = String(item.term || "").trim().toLowerCase();
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + toNumber(item.count, 1);
    return acc;
  }, {});

  return products
    .map(product => {
      const key = String(product.name || product.canonicalName || "").trim().toLowerCase();
      const salesVelocity = toNumber(product.salesVelocity, 0);
      const searchVolume = toNumber(searchBoost[key], 0);
      const trendScore = Number((salesVelocity * 0.65 + searchVolume * 0.35).toFixed(2));
      return {
        productId: product._id || product.productId || null,
        name: product.name || product.canonicalName || "",
        region,
        trendScore,
        searchVolume,
        salesVelocity,
        insight: `${product.name || product.canonicalName || "Product"} trending in ${region}`,
      };
    })
    .sort((a, b) => b.trendScore - a.trendScore);
}

async function getTrendingProducts({
  shopId = null,
  products = [],
  searches = [],
  region = "Dhaka",
  persistMetric = false,
}) {
  const startedAt = Date.now();
  const trends = detectTrends({ products, searches, region }).slice(0, 10);

  await recordIntelligenceMetric({
    tenantId: shopId,
    metricType: "TREND_DETECTION",
    latencyMs: Date.now() - startedAt,
    accuracyScore: trends.length ? 0.84 : 0.8,
    metadata: {
      region,
      trendCount: trends.length,
    },
    persist: persistMetric,
  });

  return {
    shopId,
    region,
    generatedAt: new Date().toISOString(),
    trends,
  };
}

module.exports = {
  getTrendingProducts,
  _internals: {
    detectTrends,
  },
};
