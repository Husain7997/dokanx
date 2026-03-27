const DEFAULT_PRODUCT_LIMIT = 200;
const DEFAULT_SHOP_LIMIT = 100;

function normalizeQuery(query) {
  return String(query || "").trim();
}

function normalizeQueryKey(query) {
  return normalizeQuery(query).toLowerCase();
}

function toNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["1", "true", "yes"].includes(value.toLowerCase());
  return false;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function buildPriceStats(products) {
  let min = null;
  let max = null;
  products.forEach((product) => {
    const price = Number(product.price || 0);
    if (min === null || price < min) min = price;
    if (max === null || price > max) max = price;
  });
  return { min: min ?? 0, max: max ?? 0 };
}

function normalizeRange(value, min, max, inverse = false) {
  if (max <= min) return 1;
  const clamped = Math.max(min, Math.min(max, value));
  const ratio = (clamped - min) / (max - min);
  return inverse ? 1 - ratio : ratio;
}

module.exports = {
  DEFAULT_PRODUCT_LIMIT,
  DEFAULT_SHOP_LIMIT,
  normalizeQuery,
  normalizeQueryKey,
  toNumber,
  toBoolean,
  haversineKm,
  buildPriceStats,
  normalizeRange,
};
