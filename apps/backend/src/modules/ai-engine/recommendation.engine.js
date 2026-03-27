const AiFeedback = require("../../models/aiFeedback.model");
const Product = require("../../models/product.model");
const cache = require("../../infrastructure/redis/cache.service");
const { getTrendingProducts } = require("./demand.service");
const { guardRecommendationDecision } = require("./ai-decision.guard");
const { getRealtimeFeatures } = require("./realtime-feature.service");
const { getCustomerSnapshot, getProductSnapshot } = require("./feature-store/feature-store.service");

function parseLocation(input) {
  if (!input || typeof input !== "string") return null;
  const [lat, lng] = input.split(",").map((value) => Number(value.trim()));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function buildExplorationScore(productId) {
  const seed = `${productId}:${Math.floor(Date.now() / (15 * 60 * 1000))}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 997;
  }
  return Number(((hash % 11) / 10).toFixed(2));
}

async function getFeedbackSummary(userId) {
  if (!userId) {
    return { clicked: new Set(), ignored: new Set(), purchased: new Set() };
  }

  const rows = await AiFeedback.find({
    userId,
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .select("productId eventType")
    .lean();

  return {
    clicked: new Set(rows.filter((row) => row.eventType === "click").map((row) => String(row.productId))),
    ignored: new Set(rows.filter((row) => row.eventType === "ignore").map((row) => String(row.productId))),
    purchased: new Set(rows.filter((row) => row.eventType === "purchase").map((row) => String(row.productId))),
  };
}

async function scoreProductForCustomer({ product, customerSnapshot }) {
  const productSnapshot = await getProductSnapshot(product._id, { snapshotWindow: "30d" });
  const customerFeatures = customerSnapshot?.features || {};
  const productFeatures = productSnapshot?.features || {};
  const preferredCategories = Array.isArray(customerFeatures.preferredCategories)
    ? customerFeatures.preferredCategories
    : [];
  const categoryPreference = preferredCategories.includes(product.category) ? 30 : 0;
  const popularity = Math.min(25, Number(productFeatures.popularityScore || 0) * 0.25);
  const purchaseSimilarity = preferredCategories.length
    ? Math.max(0, 20 - preferredCategories.indexOf(product.category) * 5)
    : 8;
  const proximity = 10;
  const score = purchaseSimilarity + categoryPreference + proximity + popularity;

  return {
    score: Number(score.toFixed(2)),
    reasons: [
      `purchase_similarity=${purchaseSimilarity.toFixed(1)}`,
      `category_preference=${categoryPreference.toFixed(1)}`,
      `location_proximity=${proximity.toFixed(1)}`,
      `popularity=${popularity.toFixed(1)}`,
    ],
    product: {
      _id: product._id,
      name: product.name,
      price: product.price,
      category: product.category,
      shopId: product.shopId,
      slug: product.slug,
    },
  };
}

function applyDiversitySelection(rows, limit) {
  const selected = [];
  const shopCounts = new Map();
  const categoryCounts = new Map();

  for (const row of rows) {
    const shopKey = String(row.product.shopId || "");
    const categoryKey = String(row.product.category || "");
    const shopPenalty = (shopCounts.get(shopKey) || 0) * 4;
    const categoryPenalty = (categoryCounts.get(categoryKey) || 0) * 3;
    const adjustedScore = row.score - shopPenalty - categoryPenalty;

    selected.push({
      ...row,
      score: Number(adjustedScore.toFixed(2)),
      reasons: [...row.reasons, `diversity_penalty=${(shopPenalty + categoryPenalty).toFixed(1)}`],
    });

    shopCounts.set(shopKey, (shopCounts.get(shopKey) || 0) + 1);
    categoryCounts.set(categoryKey, (categoryCounts.get(categoryKey) || 0) + 1);

    if (selected.length >= limit) break;
  }

  return selected;
}

async function buildFallbackRecommendations({ shopId, limit }) {
  const trending = await getTrendingProducts({ limit: Math.max(limit * 2, 12) });
  const names = trending.map((item) => item.name).filter(Boolean);

  const products = names.length
    ? await Product.find({
        name: { $in: names },
        isActive: true,
        moderationStatus: "APPROVED",
        ...(shopId ? { shopId } : {}),
      })
        .sort({ popularityScore: -1, createdAt: -1 })
        .limit(limit)
        .select("_id name slug price category shopId")
        .lean()
    : await Product.find({
        isActive: true,
        moderationStatus: "APPROVED",
        ...(shopId ? { shopId } : {}),
      })
        .sort({ popularityScore: -1, createdAt: -1 })
        .limit(limit)
        .select("_id name slug price category shopId")
        .lean();

  return products.map((product, index) => ({
    score: Number((30 - index).toFixed(2)),
    reasons: ["cold_start_fallback", "popular_trending_blend"],
    product,
  }));
}

async function getExplainableRecommendations({ userId, location, limit = 10, shopId = null, sessionId = null }) {
  const cacheKey = `ai:recommendations:${userId || "guest"}:${sessionId || "default"}:${shopId || "all"}:${location || "none"}:${limit}`;
  const cached = await cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const _parsedLocation = parseLocation(location);
  const [customerSnapshot, realtimeFeatures, feedbackSummary] = await Promise.all([
    userId ? getCustomerSnapshot(userId, { snapshotWindow: "30d" }) : null,
    getRealtimeFeatures({ userId, sessionId, shopId }),
    getFeedbackSummary(userId),
  ]);

  const products = await Product.find({
    isActive: true,
    moderationStatus: "APPROVED",
    ...(shopId ? { shopId } : {}),
  })
    .sort({ popularityScore: -1, createdAt: -1 })
    .limit(Math.max(limit * 4, 24))
    .select("_id name slug price category shopId")
    .lean();

  const scored = [];
  for (const product of products) {
    const base = await scoreProductForCustomer({ product, customerSnapshot });
    const productId = String(product._id);
    const cartBoost = (realtimeFeatures.cartProductIds || []).includes(productId) ? 10 : 0;
    const clickBoost =
      (realtimeFeatures.clickedProductIds || []).includes(productId) || feedbackSummary.clicked.has(productId) ? 7 : 0;
    const ignorePenalty =
      (realtimeFeatures.ignoredProductIds || []).includes(productId) || feedbackSummary.ignored.has(productId) ? 12 : 0;
    const purchasePenalty = feedbackSummary.purchased.has(productId) ? 6 : 0;
    const exploration = buildExplorationScore(productId);
    const diversityBoost =
      realtimeFeatures.activeShopIds?.length && realtimeFeatures.activeShopIds.includes(String(product.shopId)) ? 2 : 5;
    const score = base.score + cartBoost + clickBoost + diversityBoost + exploration - ignorePenalty - purchasePenalty;

    scored.push({
      ...base,
      score: Number(score.toFixed(2)),
      reasons: [
        ...base.reasons,
        `feedback_click_boost=${clickBoost.toFixed(1)}`,
        `realtime_cart_boost=${cartBoost.toFixed(1)}`,
        `ignore_penalty=${ignorePenalty.toFixed(1)}`,
        `exploration=${exploration.toFixed(1)}`,
      ],
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const diversified = applyDiversitySelection(scored, limit);
  const isColdStart = !customerSnapshot?.features?.totalOrders;
  const fallbackItems =
    isColdStart || diversified.length < limit
      ? await buildFallbackRecommendations({ shopId, limit })
      : [];
  const guarded = guardRecommendationDecision({
    items: diversified,
    fallbackItems,
    minimumCount: Math.min(limit, 4),
  });

  const result = guarded.items.slice(0, limit).map((row) => ({
    ...row,
    reasons: [...row.reasons, `confidence=${guarded.confidence}`, `decision_mode=${guarded.mode}`],
  }));

  await cache.set(cacheKey, result, 300);
  return result;
}

module.exports = {
  getExplainableRecommendations,
};
