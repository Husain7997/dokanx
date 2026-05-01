const { addJob } = require("@/core/infrastructure");
const { getOrSet } = require("../infrastructure/cache/versioned-cache.service");
const { searchIndex } = require("../services/searchIndex.service");
const {
  searchProductsAdvanced,
  searchShopsAdvanced,
  searchSuggestions,
  searchAISuggestions,
  searchTrending,
  searchNoResults,
  searchConversionRate,
  searchCategories,
  searchBrands,
} = require("../services/search.service");

async function enqueueSearchQueryLog(payload) {
  try {
    await addJob("search-log-query", payload, {
      attempts: 2,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false,
      queueName: "analytics",
    });
  } catch {
    // Keep search responses fast even if telemetry enqueue fails.
  }
}

async function enqueueSearchEvent(payload) {
  try {
    await addJob("search-log-event", payload, {
      attempts: 2,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false,
      queueName: "analytics",
    });
  } catch {
    // Keep search responses fast even if telemetry enqueue fails.
  }
}

exports.searchProducts = async (req, res) => {
  const searchParams =
    req.traffic?.type === "direct" && req.traffic.scopeShopId
      ? { ...req.query, shopId: req.traffic.scopeShopId }
      : req.query;
  const searchId = req.headers["x-search-id"] ? String(req.headers["x-search-id"]) : null;
  const cached = await getOrSet({
    namespace: "search",
    key: {
      scope: "search-products",
      query: searchParams,
      traffic: req.traffic?.type || "default",
    },
    ttlSeconds: 30,
    resolver: () => searchProductsAdvanced(searchParams),
  });
  const result = cached.value;
  await enqueueSearchQueryLog({
    query: req.query.q,
    entityTypes: ["product"],
    filters: searchParams,
    resultsCount: result.count,
    userId: req.user?._id || null,
    shopId: searchParams.shopId || null,
    searchId,
  });
  await enqueueSearchEvent({
    searchId,
    query: req.query.q,
    eventType: "SEARCH",
    userId: req.user?._id || null,
    shopId: searchParams.shopId || null,
  });
  res.json(result);
};

exports.searchAll = async (req, res) => {
  const searchId = req.headers["x-search-id"] ? String(req.headers["x-search-id"]) : null;
  const query = req.query.q;
  const searchParams =
    req.traffic?.type === "direct" && req.traffic.scopeShopId
      ? { ...req.query, shopId: req.traffic.scopeShopId }
      : req.query;

  if (req.traffic?.type === "direct") {
    const cached = await getOrSet({
      namespace: "search",
      key: {
        scope: "search-all-direct",
        query: searchParams,
      },
      ttlSeconds: 30,
      resolver: () => searchProductsAdvanced(searchParams),
    });
    const products = cached.value;
    return res.json({
      products: products.data || [],
      shops: [],
      categories: [],
    });
  }

  const cached = await getOrSet({
    namespace: "search",
    key: {
      scope: "search-all",
      query: searchParams,
    },
    ttlSeconds: 30,
    resolver: async () => {
      const [products, shops, categories] = await Promise.all([
        searchProductsAdvanced(searchParams),
        searchShopsAdvanced(searchParams),
        searchCategories(query ? String(query) : "", 12),
      ]);

      return {
        products: products.data || [],
        shops: shops.data || [],
        categories: categories || [],
        _meta: {
          productsCount: products.count || 0,
          shopsCount: shops.count || 0,
          categoriesCount: categories.length,
        },
      };
    },
  });
  const payload = cached.value;
  await enqueueSearchQueryLog({
    query,
    entityTypes: ["product", "shop", "category"],
    filters: searchParams,
    resultsCount:
      Number(payload._meta?.productsCount || 0) +
      Number(payload._meta?.shopsCount || 0) +
      Number(payload._meta?.categoriesCount || 0),
    userId: req.user?._id || null,
    searchId,
  });
  await enqueueSearchEvent({
    searchId,
    query,
    eventType: "SEARCH",
    userId: req.user?._id || null,
  });
  res.json({
    products: payload.products || [],
    shops: payload.shops || [],
    categories: payload.categories || [],
  });
};

exports.searchShops = async (req, res) => {
  if (req.traffic?.type === "direct") {
    return res.json({ data: [], count: 0 });
  }
  const searchId = req.headers["x-search-id"] ? String(req.headers["x-search-id"]) : null;
  const cached = await getOrSet({
    namespace: "search",
    key: {
      scope: "search-shops",
      query: req.query,
    },
    ttlSeconds: 30,
    resolver: () => searchShopsAdvanced(req.query),
  });
  const result = cached.value;
  await enqueueSearchQueryLog({
    query: req.query.q,
    entityTypes: ["shop"],
    filters: req.query,
    resultsCount: result.count,
    userId: req.user?._id || null,
    searchId,
  });
  await enqueueSearchEvent({
    searchId,
    query: req.query.q,
    eventType: "SEARCH",
    userId: req.user?._id || null,
  });
  res.json(result);
};

exports.rebuildSearchIndex = async (_req, res) => {
  await addJob("search-reindex-full", { triggeredAt: new Date().toISOString() }, {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false,
    queueName: "analytics",
  });
  res.status(202).json({ queued: true, mode: "full" });
};

exports.searchIndex = async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ message: "q required" });
  const results = await searchIndex(String(q));
  res.json({ data: results, count: results.length });
};

exports.searchStatus = async (_req, res) => {
  const SearchSyncState = require("../models/searchSyncState.model");
  const SearchIndex = require("../models/searchIndex.model");
  const SearchSyncLog = require("../models/searchSyncLog.model");
  const state = await SearchSyncState.findOne({ key: "search" }).lean();
  const totalDocs = await SearchIndex.countDocuments();
  const recentLogs = await SearchSyncLog.find().sort({ createdAt: -1 }).limit(10).lean();
  res.json({
    data: {
      lastRunAt: state?.lastRunAt || null,
      totalDocs,
      logs: recentLogs,
    },
  });
};

exports.reindexDelta = async (_req, res) => {
  await addJob("search-reindex-delta", { triggeredAt: new Date().toISOString() }, {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false,
    queueName: "analytics",
  });
  res.status(202).json({ queued: true, mode: "delta" });
};

exports.searchSuggestions = async (req, res) => {
  const { q, limit } = req.query;
  if (!q) return res.json({ data: [], count: 0 });
  const parsedLimit = Number(limit || 8);
  const shopId = req.traffic?.type === "direct" ? req.traffic.scopeShopId || undefined : undefined;
  if (req.traffic?.type === "direct") {
    const scoped = await searchProductsAdvanced({
      q,
      limit: parsedLimit,
      shopId,
    });
    const suggestions = (scoped.data || []).slice(0, parsedLimit).map((item) => ({
      id: item._id,
      name: item.name,
      entityType: "product",
    }));
    return res.json({ data: suggestions, count: suggestions.length });
  }

  const cached = await getOrSet({
    namespace: "search",
    key: {
      scope: "search-suggestions",
      query: req.query,
      userId: req.user?._id || null,
      shopId: shopId || null,
      sessionId: req.headers["x-session-id"] || req.headers["x-device-id"] || req.ip,
      traffic: req.traffic?.type || "default",
    },
    ttlSeconds: req.user ? 15 : 30,
    resolver: () =>
      searchAISuggestions(
        String(q),
        parsedLimit,
        req.user?._id || null,
        shopId || null,
        req.headers["x-session-id"] || req.headers["x-device-id"] || req.ip,
      ),
  });
  const suggestions = cached.value;
  res.json({ data: suggestions, count: suggestions.length });
};

exports.searchTrending = async (req, res) => {
  if (req.traffic?.type === "direct") {
    return res.json({ data: [], count: 0 });
  }
  const { days, limit } = req.query;
  const cached = await getOrSet({
    namespace: "search",
    key: {
      scope: "search-trending",
      days: Number(days || 7),
      limit: Number(limit || 10),
    },
    ttlSeconds: 120,
    resolver: () => searchTrending({ days: Number(days || 7), limit: Number(limit || 10) }),
  });
  const results = cached.value;
  res.json({ data: results, count: results.length });
};

exports.searchNoResults = async (req, res) => {
  const { days, limit } = req.query;
  const results = await searchNoResults({ days: Number(days || 30), limit: Number(limit || 10) });
  res.json({ data: results, count: results.length });
};

exports.searchConversion = async (req, res) => {
  const { days } = req.query;
  const results = await searchConversionRate({ days: Number(days || 30) });
  res.json({ data: results });
};

exports.searchCategories = async (req, res) => {
  const { q, limit } = req.query;
  const cached = await getOrSet({
    namespace: "search",
    key: {
      scope: "search-categories",
      q: q ? String(q) : "",
      limit: Number(limit || 20),
    },
    ttlSeconds: 300,
    resolver: () => searchCategories(q ? String(q) : "", Number(limit || 20)),
  });
  const results = cached.value;
  res.json({ data: results, count: results.length });
};

exports.searchBrands = async (req, res) => {
  const { q, limit } = req.query;
  const cached = await getOrSet({
    namespace: "search",
    key: {
      scope: "search-brands",
      q: q ? String(q) : "",
      limit: Number(limit || 20),
    },
    ttlSeconds: 300,
    resolver: () => searchBrands(q ? String(q) : "", Number(limit || 20)),
  });
  const results = cached.value;
  res.json({ data: results, count: results.length });
};
