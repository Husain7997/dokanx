const { rebuildIndex, searchIndex } = require("../services/searchIndex.service");
const {
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
} = require("../services/search.service");

exports.searchProducts = async (req, res) => {
  const searchParams =
    req.traffic?.type === "direct" && req.traffic.scopeShopId
      ? { ...req.query, shopId: req.traffic.scopeShopId }
      : req.query;
  const searchId = req.headers["x-search-id"] ? String(req.headers["x-search-id"]) : null;
  const result = await searchProductsAdvanced(searchParams);
  await logSearchQuery({
    query: req.query.q,
    entityTypes: ["product"],
    filters: searchParams,
    resultsCount: result.count,
    userId: req.user?._id || null,
    shopId: searchParams.shopId || null,
    searchId,
  });
  await logSearchEvent({
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
    const products = await searchProductsAdvanced(searchParams);
    return res.json({
      products: products.data || [],
      shops: [],
      categories: [],
    });
  }

  const [products, shops, categories] = await Promise.all([
    searchProductsAdvanced(searchParams),
    searchShopsAdvanced(searchParams),
    searchCategories(query ? String(query) : "", 12),
  ]);
  await logSearchQuery({
    query,
    entityTypes: ["product", "shop", "category"],
    filters: searchParams,
    resultsCount: (products.count || 0) + (shops.count || 0) + categories.length,
    userId: req.user?._id || null,
    searchId,
  });
  await logSearchEvent({
    searchId,
    query,
    eventType: "SEARCH",
    userId: req.user?._id || null,
  });
  res.json({
    products: products.data || [],
    shops: shops.data || [],
    categories: categories || [],
  });
};

exports.searchShops = async (req, res) => {
  if (req.traffic?.type === "direct") {
    return res.json({ data: [], count: 0 });
  }
  const searchId = req.headers["x-search-id"] ? String(req.headers["x-search-id"]) : null;
  const result = await searchShopsAdvanced(req.query);
  await logSearchQuery({
    query: req.query.q,
    entityTypes: ["shop"],
    filters: req.query,
    resultsCount: result.count,
    userId: req.user?._id || null,
    searchId,
  });
  await logSearchEvent({
    searchId,
    query: req.query.q,
    eventType: "SEARCH",
    userId: req.user?._id || null,
  });
  res.json(result);
};

exports.rebuildSearchIndex = async (_req, res) => {
  const result = await rebuildIndex();
  res.json({ message: "Search index rebuilt", data: result });
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
  const { updateIncrementalIndex } = require("../services/searchIndex.service");
  const result = await updateIncrementalIndex();
  res.json({ message: "Search delta indexed", data: result });
};

exports.searchSuggestions = async (req, res) => {
  const { q, limit } = req.query;
  if (!q) return res.json({ data: [], count: 0 });
  if (req.traffic?.type === "direct") {
    const scoped = await searchProductsAdvanced({
      q,
      limit,
      shopId: req.traffic.scopeShopId || undefined,
    });
    const suggestions = (scoped.data || []).slice(0, Number(limit || 8)).map((item) => ({
      id: item._id,
      name: item.name,
      entityType: "product",
    }));
    return res.json({ data: suggestions, count: suggestions.length });
  }
  const suggestions = await searchSuggestions(String(q), Number(limit || 8));
  res.json({ data: suggestions, count: suggestions.length });
};

exports.searchTrending = async (req, res) => {
  if (req.traffic?.type === "direct") {
    return res.json({ data: [], count: 0 });
  }
  const { days, limit } = req.query;
  const results = await searchTrending({ days: Number(days || 7), limit: Number(limit || 10) });
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
  const results = await searchCategories(q ? String(q) : "", Number(limit || 20));
  res.json({ data: results, count: results.length });
};

exports.searchBrands = async (req, res) => {
  const { q, limit } = req.query;
  const results = await searchBrands(q ? String(q) : "", Number(limit || 20));
  res.json({ data: results, count: results.length });
};
