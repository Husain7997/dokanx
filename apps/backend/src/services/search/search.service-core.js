const Product = require("../../models/product.model");
const Shop = require("../../models/shop.model");
const ShopLocation = require("../../models/shopLocation.model");
const SearchQueryLog = require("../../models/searchQueryLog.model");
const SearchEvent = require("../../models/searchEvent.model");
const { searchIndex } = require("../searchIndex.service");

const {
  DEFAULT_PRODUCT_LIMIT,
  DEFAULT_SHOP_LIMIT,
  normalizeQuery,
  normalizeQueryKey,
  toNumber,
  toBoolean,
  buildPriceStats,
  normalizeRange,
} = require("./search.utils");
const {
  buildProductRatings,
  buildShopRatings,
  buildShopDistances,
} = require("./search.metrics");

async function logSearchQuery({ query, entityTypes, filters, resultsCount, userId, shopId, searchId }) {
  const normalized = normalizeQueryKey(query);
  if (!normalized) return;
  await SearchQueryLog.create({
    query: String(query),
    queryNormalized: normalized,
    searchId: searchId || null,
    entityTypes: entityTypes || [],
    filters: filters || {},
    resultsCount: Number(resultsCount || 0),
    userId: userId || null,
    shopId: shopId || null,
  });
}

async function logSearchEvent({ searchId, query, eventType, userId, shopId, metadata }) {
  if (!searchId) return;
  const normalized = normalizeQueryKey(query);
  await SearchEvent.create({
    searchId: String(searchId),
    query: query ? String(query) : "",
    queryNormalized: normalized,
    eventType,
    userId: userId || null,
    shopId: shopId || null,
    metadata: metadata || {},
  });
}

async function searchProductsAdvanced(params) {
  const query = normalizeQuery(params.q);
  const shopId = params.shopId ? String(params.shopId) : null;
  const category = params.category ? String(params.category) : null;
  const brand = params.brand ? String(params.brand) : null;
  const minPrice = toNumber(params.minPrice, null);
  const maxPrice = toNumber(params.maxPrice, null);
  const minRating = toNumber(params.minRating, null);
  const minDiscount = toNumber(params.minDiscount, null);
  const maxDistance = toNumber(params.distance, null);
  const lat = toNumber(params.lat, null);
  const lng = toNumber(params.lng, null);
  const inStock = toBoolean(params.inStock);
  const limit = Math.min(toNumber(params.limit, DEFAULT_PRODUCT_LIMIT) || DEFAULT_PRODUCT_LIMIT, DEFAULT_PRODUCT_LIMIT);

  const filter = {};
  if (shopId) filter.shopId = shopId;
  if (category) filter.category = category;
  if (brand) filter.brand = brand;
  if (query) {
    const indexResults = await searchIndex(query);
    const productIds = indexResults
      .filter((row) => row.entityType === "product")
      .map((row) => row.entityId)
      .filter(Boolean);
    if (productIds.length) {
      filter._id = { $in: productIds };
    } else {
      filter.name = { $regex: query, $options: "i" };
    }
  }

  const products = await Product.find(filter).limit(limit).lean();
  if (!products.length) return { data: [], count: 0 };

  const productIds = products.map((product) => product._id);
  const shopIds = Array.from(new Set(products.map((product) => String(product.shopId || "")))).filter(Boolean);

  const [ratingsMap, shops, distanceMap] = await Promise.all([
    buildProductRatings(productIds),
    Shop.find({ _id: { $in: shopIds } }).select("name trustScore popularityScore").lean(),
    buildShopDistances(shopIds, lat, lng),
  ]);

  const shopMap = new Map();
  shops.forEach((shop) => {
    shopMap.set(String(shop._id), shop);
  });

  const { min: minPriceValue, max: maxPriceValue } = buildPriceStats(products);

  const weighted = products.map((product) => {
    const shop = shopMap.get(String(product.shopId));
    const ratings = ratingsMap.get(String(product._id)) || { avgRating: 0, count: 0 };
    const availableStock = Number(product.stock || 0) - Number(product.reserved || 0);
    const distanceKm = distanceMap.get(String(product.shopId)) != null ? distanceMap.get(String(product.shopId)) : null;
    const trustScore = shop?.trustScore ?? null;
    const popularityScore = Number(product.popularityScore || 0) + Number(shop?.popularityScore || 0);

    const score =
      0.3 * (distanceKm == null ? 0.5 : normalizeRange(distanceKm, 0, maxDistance || 20, true)) +
      0.2 * normalizeRange(Number(product.price || 0), minPriceValue, maxPriceValue, true) +
      0.2 * (ratings.avgRating ? ratings.avgRating / 5 : 0.5) +
      0.15 * (availableStock > 0 ? 1 : 0) +
      0.15 * (trustScore == null ? 0.5 : Math.min(Math.max(trustScore, 0), 100) / 100);

    return {
      ...product,
      availableStock,
      ratingAverage: ratings.avgRating || 0,
      ratingCount: ratings.count || 0,
      distanceKm,
      shop: shop ? { id: shop._id, name: shop.name, trustScore: shop.trustScore || 0 } : null,
      _score: score + popularityScore * 0.001,
    };
  });

  let filtered = weighted;
  if (minPrice != null) filtered = filtered.filter((row) => Number(row.price || 0) >= minPrice);
  if (maxPrice != null) filtered = filtered.filter((row) => Number(row.price || 0) <= maxPrice);
  if (minRating != null) filtered = filtered.filter((row) => Number(row.ratingAverage || 0) >= minRating);
  if (inStock) filtered = filtered.filter((row) => row.availableStock > 0);
  if (minDiscount != null) filtered = filtered.filter((row) => Number(row.discountRate || 0) >= minDiscount);
  if (maxDistance != null) filtered = filtered.filter((row) => row.distanceKm != null && row.distanceKm <= maxDistance);

  filtered.sort((a, b) => Number(b._score || 0) - Number(a._score || 0));
  return { data: filtered, count: filtered.length };
}

async function searchShopsAdvanced(params) {
  const query = normalizeQuery(params.q);
  const district = params.district ? String(params.district) : null;
  const market = params.market ? String(params.market) : null;
  const maxDistance = toNumber(params.distance, null);
  const lat = toNumber(params.lat, null);
  const lng = toNumber(params.lng, null);
  const limit = Math.min(toNumber(params.limit, DEFAULT_SHOP_LIMIT) || DEFAULT_SHOP_LIMIT, DEFAULT_SHOP_LIMIT);

  const filter = { isActive: true, status: "ACTIVE" };
  if (query) {
    const indexResults = await searchIndex(query);
    const shopIds = indexResults
      .filter((row) => row.entityType === "shop")
      .map((row) => row.entityId)
      .filter(Boolean);
    if (shopIds.length) {
      filter._id = { $in: shopIds };
    } else {
      filter.name = { $regex: query, $options: "i" };
    }
  }

  if (district || market) {
    const locationFilter = { isActive: true };
    if (district) locationFilter.city = String(district);
    if (market) locationFilter.name = String(market);
    const locations = await ShopLocation.find(locationFilter).select("shopId").lean();
    const shopIds = locations.map((row) => row.shopId);
    if (shopIds.length) {
      filter._id = { $in: shopIds };
    } else {
      return { data: [], count: 0 };
    }
  }

  const shops = await Shop.find(filter).select("name slug domain trustScore popularityScore").limit(limit).lean();
  if (!shops.length) return { data: [], count: 0 };

  const shopIds = shops.map((shop) => shop._id);
  const [ratingsMap, distanceMap] = await Promise.all([
    buildShopRatings(shopIds),
    buildShopDistances(
      shops.map((shop) => String(shop._id)),
      lat,
      lng
    ),
  ]);

  const weighted = shops.map((shop) => {
    const ratings = ratingsMap.get(String(shop._id)) || { avgRating: 0, count: 0 };
    const distanceKm = distanceMap.get(String(shop._id)) ?? null;
    const trustScore = shop.trustScore ?? null;
    const popularityScore = Number(shop.popularityScore || 0);
    const score =
      0.45 * (distanceKm == null ? 0.5 : normalizeRange(distanceKm, 0, maxDistance || 20, true)) +
      0.35 * (ratings.avgRating ? ratings.avgRating / 5 : 0.5) +
      0.2 * (trustScore == null ? 0.5 : Math.min(Math.max(trustScore, 0), 100) / 100);

    return {
      ...shop,
      ratingAverage: ratings.avgRating || 0,
      ratingCount: ratings.count || 0,
      distanceKm,
      _score: score + popularityScore * 0.001,
    };
  });

  let filtered = weighted;
  if (maxDistance != null) filtered = filtered.filter((row) => row.distanceKm != null && row.distanceKm <= maxDistance);

  filtered.sort((a, b) => Number(b._score || 0) - Number(a._score || 0));
  return { data: filtered, count: filtered.length };
}

async function searchSuggestions(query, limit = 8) {
  const normalized = normalizeQuery(query);
  if (!normalized) return [];
  const indexResults = await searchIndex(normalized);
  const suggestions = [];
  const seen = new Set();
  indexResults.forEach((row) => {
    const label = String(row.name || row.text || "").trim();
    if (!label) return;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    suggestions.push({
      id: row.entityId || row._id,
      name: label,
      entityType: row.entityType || "unknown",
    });
  });

  return suggestions.slice(0, limit);
}

async function searchTrending({ days = 7, limit = 10 } = {}) {
  const since = new Date(Date.now() - Number(days || 7) * 24 * 60 * 60 * 1000);
  const rows = await SearchQueryLog.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: "$queryNormalized", query: { $first: "$query" }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: Number(limit || 10) },
  ]);
  return rows.map((row) => ({ query: row.query, count: row.count }));
}

async function searchNoResults({ days = 30, limit = 10 } = {}) {
  const since = new Date(Date.now() - Number(days || 30) * 24 * 60 * 60 * 1000);
  const rows = await SearchQueryLog.aggregate([
    { $match: { createdAt: { $gte: since }, resultsCount: 0 } },
    { $group: { _id: "$queryNormalized", query: { $first: "$query" }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: Number(limit || 10) },
  ]);
  return rows.map((row) => ({ query: row.query, count: row.count }));
}

async function searchConversionRate({ days = 30 } = {}) {
  const since = new Date(Date.now() - Number(days || 30) * 24 * 60 * 60 * 1000);
  const rows = await SearchEvent.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: "$searchId",
        hasSearch: { $max: { $cond: [{ $eq: ["$eventType", "SEARCH"] }, 1, 0] } },
        hasAddToCart: { $max: { $cond: [{ $eq: ["$eventType", "ADD_TO_CART"] }, 1, 0] } },
        hasCheckout: { $max: { $cond: [{ $eq: ["$eventType", "CHECKOUT"] }, 1, 0] } },
      },
    },
  ]);

  const totalSearches = rows.filter((row) => row.hasSearch).length;
  const addToCart = rows.filter((row) => row.hasAddToCart).length;
  const checkout = rows.filter((row) => row.hasCheckout).length;

  return {
    totalSearches,
    addToCart,
    checkout,
    addToCartRate: totalSearches ? Number((addToCart / totalSearches).toFixed(4)) : 0,
    checkoutRate: totalSearches ? Number((checkout / totalSearches).toFixed(4)) : 0,
  };
}

async function searchCategories(query, limit = 20) {
  const filter = { category: { $ne: "" } };
  if (query) filter.category = { $regex: String(query), $options: "i" };
  const rows = await Product.find(filter).distinct("category");
  return rows.filter(Boolean).slice(0, limit);
}

async function searchBrands(query, limit = 20) {
  const filter = { brand: { $ne: "" } };
  if (query) filter.brand = { $regex: String(query), $options: "i" };
  const rows = await Product.find(filter).distinct("brand");
  return rows.filter(Boolean).slice(0, limit);
}

module.exports = {
  logSearchQuery,
  logSearchEvent,
  searchProductsAdvanced,
  searchShopsAdvanced,
  searchSuggestions,
  searchTrending,
  searchNoResults,
  searchConversionRate,
  searchCategories,
  searchBrands,
};
