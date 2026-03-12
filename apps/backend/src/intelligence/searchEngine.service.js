const { rankDiscoveryResults } = require("./rankingEngine.service");
const { filterNearby } = require("./geoSearch.service");
const { recordIntelligenceMetric } = require("./intelligenceTelemetry.service");

function buildRelevanceScore(item = {}, query = "") {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return 0.5;
  const haystack = `${item.name || ""} ${item.brand || ""} ${item.category || ""}`.toLowerCase();
  if (haystack === normalizedQuery) return 1;
  if (haystack.startsWith(normalizedQuery)) return 0.9;
  if (haystack.includes(normalizedQuery)) return 0.75;
  return 0.25;
}

async function searchCatalog({
  shopId = null,
  query = "",
  products = [],
  origin = null,
  radiusKm = 10,
  limit = 20,
  persistMetric = false,
}) {
  const startedAt = Date.now();
  const candidates = origin ? filterNearby(products, origin, radiusKm) : [...products];
  const enriched = candidates.map(item => ({
    ...item,
    relevance: buildRelevanceScore(item, query),
  }));
  const ranked = rankDiscoveryResults(enriched).slice(0, Math.min(Math.max(Number(limit) || 20, 1), 100));
  const latencyMs = Date.now() - startedAt;

  await recordIntelligenceMetric({
    tenantId: shopId,
    metricType: "SEARCH_ENGINE",
    latencyMs,
    accuracyScore: ranked.length ? 0.85 : 0.8,
    metadata: { resultCount: ranked.length, query },
    persist: persistMetric,
  });

  return {
    shopId,
    query,
    latencyMs,
    results: ranked,
  };
}

module.exports = {
  searchCatalog,
  _internals: {
    buildRelevanceScore,
  },
};
