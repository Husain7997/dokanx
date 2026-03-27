const Event = require("../models/event.model");
const Product = require("../models/product.model");
const SearchQueryLog = require("../models/searchQueryLog.model");
const Shop = require("../models/shop.model");
const AiFeedback = require("../models/aiFeedback.model");
const aiContext = require("../modules/ai-engine/ai-context.middleware");
const { getExplainableRecommendations } = require("../modules/ai-engine/recommendation.engine");
const { getTrendingProducts, getDemandForecast, getLowStockAlerts } = require("../modules/ai-engine/demand.service");
const { getOfferTargetCustomers } = require("../modules/ai-engine/customer-score.service");
const { getTopCustomerSnapshots, getRiskyCustomerSnapshots } = require("../modules/ai-engine/feature-store/feature-store.service");
const { registerRealtimeFeedback } = require("../modules/ai-engine/realtime-feature.service");
const recommendationService = require("../services/recommendation.service");
const fraudService = require("../services/fraud.service");

exports.withContext = aiContext;

exports.getRecommendations = async (req, res) => {
  const limit = Number(req.query.limit || 8);
  const data = await getExplainableRecommendations({
    userId: req.user?._id || null,
    location: req.query.location || null,
    limit,
    shopId: req.traffic?.type === "direct" ? req.traffic?.scopeShopId || null : null,
    sessionId: req.headers["x-session-id"] || req.headers["x-device-id"] || req.ip,
  });
  res.json({
    data: [
      {
        type: req.query.type || "hybrid",
        query: "hybrid_explainable",
        items: data.map((row) => ({
          id: row.product._id,
          name: row.product.name,
          score: row.score,
          reason: row.reasons.join(" | "),
          price: row.product.price,
        })),
      },
    ],
  });
};

exports.getTrending = async (req, res) => {
  res.json({ data: await getTrendingProducts({ limit: Number(req.query.limit || 10) }) });
};

exports.getSimilarProducts = async (req, res) => {
  const data = await recommendationService.getProductRecommendations({
    productId: req.query.product,
    userId: req.user?._id || null,
    limit: Number(req.query.limit || 6),
    trafficType: req.traffic?.type,
    shopId: req.traffic?.scopeShopId || null,
  });
  res.json({
    data: [
      {
        base: req.query.product || "product",
        items: (data.similar_products || []).map((item) => ({
          name: item.name,
          similarity: Number(item.popularityScore || 0),
          price: item.price,
        })),
      },
    ],
  });
};

exports.getDemandForecast = async (req, res) => {
  res.json({ data: await getDemandForecast({ days: req.query.range || "30" }) });
};

exports.getPricingInsights = async (_req, res) => {
  const products = await Product.find({ isActive: true })
    .sort({ stock: 1, popularityScore: -1 })
    .limit(10)
    .select("name price stock popularityScore")
    .lean();
  res.json({
    data: products.map((product) => ({
      product: product.name,
      marketPrice: Number(product.price || 0),
      yourPrice: Number(product.price || 0),
      suggestion: Number((Number(product.price || 0) * (Number(product.stock || 0) <= 5 ? 1.05 : 0.98)).toFixed(2)),
      inventory: Number(product.stock || 0),
      velocity: Number(product.popularityScore || 0) > 50 ? "high" : "steady",
      competitor: "platform_average",
    })),
  });
};

exports.getMerchantInsights = async (_req, res) => {
  const [fraudOverview, trendingProducts, lowStock, topCustomers, riskyCustomers] = await Promise.all([
    fraudService.getOverview(),
    getTrendingProducts({ limit: 5 }),
    getLowStockAlerts({ limit: 5 }),
    getTopCustomerSnapshots(5),
    getRiskyCustomerSnapshots(5),
  ]);
  res.json({
    data: [
      { id: "fraud-open-cases", title: "Fraud alerts", message: `${fraudOverview.summary?.openCases || 0} open cases need review.`, badge: (fraudOverview.summary?.openCases || 0) > 0 ? "warning" : "success" },
      { id: "demand-trending", title: "Trending products", message: trendingProducts.length ? `${trendingProducts[0].name} leads demand velocity.` : "No trending products yet.", badge: "info" },
      { id: "inventory-risk", title: "Low stock risk", message: `${lowStock.length} products are near stock-out.`, badge: lowStock.length ? "warning" : "success" },
      { id: "top-customers", title: "Top customers", message: `${topCustomers.length} customers have strong spend signals today.`, badge: "success" },
      { id: "risky-customers", title: "Risky customers", message: `${riskyCustomers.length} customers need credit attention.`, badge: riskyCustomers.length ? "warning" : "info" },
    ],
  });
};

exports.getSearchIntelligence = async (_req, res) => {
  const topQueries = await SearchQueryLog.aggregate([
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$queryNormalized", query: { $first: "$query" }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 },
  ]);
  res.json({
    data: topQueries.map((row) => ({
      query: row.query,
      expansions: [row.query, `${row.query} price`, `${row.query} near me`],
      intent: row.count > 5 ? "transactional" : "exploratory",
    })),
  });
};

exports.getLocationInsights = async (_req, res) => {
  const shops = await Shop.aggregate([
    { $group: { _id: "$city", shops: { $sum: 1 }, averageTrust: { $avg: "$trustScore" } } },
    { $sort: { shops: -1 } },
    { $limit: 8 },
  ]);
  res.json({
    data: shops.map((row) => ({
      city: row._id || "Unknown",
      picks: [`${row.shops} shops`, `trust ${Number(row.averageTrust || 0).toFixed(1)}`],
      demandIndex: Number((row.shops * 10 + Number(row.averageTrust || 0)).toFixed(2)),
    })),
  });
};

exports.getWarehouseOverview = async (_req, res) => {
  const [eventsCount, eventsPerHour, feedbackCount] = await Promise.all([
    Event.countDocuments(),
    Event.countDocuments({ createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } }),
    AiFeedback.countDocuments(),
  ]);
  res.json({ data: { pipelines: 4, jobs: eventsCount, tables: 3, eventsPerHour, anomalyRate: 0, lastRefresh: new Date().toISOString(), feedbackCount } });
};

exports.getWarehouseCohorts = async (_req, res) => {
  const topCustomers = await getOfferTargetCustomers({ limit: 5 });
  res.json({
    data: topCustomers.map((row, index) => ({
      cohort: `Tier ${index + 1}`,
      merchants: row.orderCount,
      retained: Math.round(row.totalSpent || 0),
      retentionRate: Number((row.customerScore / 100).toFixed(2)),
    })),
  });
};

exports.recordFeedback = async (req, res) => {
  const { productId, shopId, eventType, context, metadata } = req.body || {};
  if (!["click", "purchase", "ignore"].includes(String(eventType || ""))) {
    return res.status(400).json({ message: "Unsupported feedback event" });
  }
  const created = await AiFeedback.create({
    userId: req.user?._id || null,
    productId: productId || null,
    shopId: shopId || null,
    eventType,
    context: context || "general",
    metadata: metadata || {},
  });
  await registerRealtimeFeedback({
    userId: req.user?._id || null,
    sessionId: req.headers["x-session-id"] || req.headers["x-device-id"] || req.ip,
    productId: productId || null,
    shopId: shopId || null,
    eventType,
  });
  res.status(201).json({ data: created });
};
