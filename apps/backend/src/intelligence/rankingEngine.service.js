function clamp(value, min, max) {
  return Math.min(Math.max(Number(value || 0), min), max);
}

function normalizePriceScore(price, maxPrice = 1000) {
  return 1 - clamp(Number(price || 0) / Math.max(Number(maxPrice || 1000), 1), 0, 1);
}

function normalizeDistanceScore(distanceKm, maxDistanceKm = 20) {
  return 1 - clamp(Number(distanceKm || 0) / Math.max(Number(maxDistanceKm || 20), 1), 0, 1);
}

function computeDiscoveryScore({
  relevance = 0,
  distanceKm = 0,
  rating = 0,
  price = 0,
  stock = 0,
  trustScore = 0,
  maxPrice = 1000,
}) {
  const score =
    clamp(relevance, 0, 1) * 0.35 +
    normalizeDistanceScore(distanceKm) * 0.2 +
    clamp(Number(rating || 0) / 5, 0, 1) * 0.15 +
    normalizePriceScore(price, maxPrice) * 0.15 +
    clamp(Number(stock || 0) / 100, 0, 1) * 0.1 +
    clamp(Number(trustScore || 0) / 100, 0, 1) * 0.05;

  return Number(score.toFixed(4));
}

function rankDiscoveryResults(items = [], options = {}) {
  const maxPrice = Math.max(
    Number(options.maxPrice || 0),
    ...items.map(item => Number(item.price || 0)).filter(value => Number.isFinite(value))
  ) || 1000;

  return items
    .map(item => ({
      ...item,
      aiScore: computeDiscoveryScore({
        relevance: item.relevance || 0,
        distanceKm: item.distanceKm || 0,
        rating: item.ratingAverage || item.rating || 0,
        price: item.price || 0,
        stock: item.stock || 0,
        trustScore: item.trustScore || 0,
        maxPrice,
      }),
    }))
    .sort((a, b) => b.aiScore - a.aiScore);
}

module.exports = {
  computeDiscoveryScore,
  rankDiscoveryResults,
};
