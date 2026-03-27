const Product = require("../../models/product.model");
const Event = require("../../models/event.model");
const { getExplainableRecommendations } = require("../../modules/ai-engine/recommendation.engine");

const {
  normalizeLimit,
  parseLocation,
  uniqueIds,
  isValidObjectId,
  WINDOWS,
} = require("./recommendation.utils");
const {
  getCached,
  getProductsByIds,
  getScopedShopProducts,
  getTrendingProducts,
  getPopularProducts,
  getSimilarProducts,
  getCustomersAlsoBought,
  getMoreFromShop,
  buildUserPreferenceSignals,
  getNearbyPopularShops,
  getTopRatedShops,
} = require("./recommendation.data");

async function getRecommendedForYou({ userId, limit }) {
  if (!userId) return getPopularProducts({ limit });

  const signals = await buildUserPreferenceSignals({ userId });
  const candidates = [];

  if (signals.categories.length || signals.brands.length) {
    const categoryQuery = signals.categories.length ? { category: { $in: signals.categories } } : null;
    const brandQuery = signals.brands.length ? { brand: { $in: signals.brands } } : null;

    const matched = await Product.find({
      isActive: true,
      moderationStatus: "APPROVED",
      $or: [categoryQuery, brandQuery].filter(Boolean),
    })
      .sort({ popularityScore: -1, createdAt: -1 })
      .limit(limit * 2)
      .select("_id name slug price discountRate shopId category brand popularityScore stock")
      .lean();

    candidates.push(...matched);
  }

  if (signals.queries?.length) {
    const regexes = signals.queries.map(
      (query) => new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
    );
    const searchMatched = await Product.find({
      isActive: true,
      moderationStatus: "APPROVED",
      $or: [
        { name: { $in: regexes } },
        { category: { $in: regexes } },
        { brand: { $in: regexes } },
      ],
    })
      .sort({ popularityScore: -1, createdAt: -1 })
      .limit(limit * 2)
      .select("_id name slug price discountRate shopId category brand popularityScore stock")
      .lean();

    candidates.push(...searchMatched);
  }

  const excluded = new Set(signals.orderedProductIds.map((id) => String(id)));
  const uniqueCandidateIds = uniqueIds(
    candidates.map((product) => product._id).filter((id) => !excluded.has(String(id)))
  );
  const recommended = await getProductsByIds(uniqueCandidateIds);

  if (recommended.length >= limit) return recommended.slice(0, limit);

  const fallback = await getTrendingProducts({ window: "7d", limit });
  const combined = uniqueIds([
    ...recommended.map((item) => item._id),
    ...fallback.map((item) => item._id),
  ]);

  return getProductsByIds(combined).then((rows) => rows.slice(0, limit));
}

async function getHomeRecommendations({ userId, location, limit, trafficType = "marketplace", shopId = null }) {
  const parsedLimit = normalizeLimit(limit);
  const loc = parseLocation(location);
  const cacheKey = `rec:home:${userId || "guest"}:${location || "na"}:${parsedLimit}`;

  return getCached(cacheKey, 900, async () => {
    if (trafficType === "direct") {
      const scopedProducts = await getScopedShopProducts(shopId, parsedLimit);
      return {
        trending_products: scopedProducts,
        recommended_products: scopedProducts,
        popular_shops: [],
        recently_viewed: [],
        flash_deals: scopedProducts.filter((item) => Number(item.discountRate || 0) > 0).slice(0, parsedLimit),
      };
    }

    const [trendingProducts, aiRecommendedProducts, popularShops, flashDeals] = await Promise.all([
      getTrendingProducts({ window: "7d", limit: parsedLimit }),
      getExplainableRecommendations({ userId, location, limit: parsedLimit, shopId: null }),
      getNearbyPopularShops({ location: loc, limit: parsedLimit }),
      Product.find({
        isActive: true,
        moderationStatus: "APPROVED",
        discountRate: { $gt: 0 },
      })
        .sort({ discountRate: -1, createdAt: -1 })
        .limit(parsedLimit)
        .select("_id name slug price discountRate shopId category brand popularityScore stock")
        .lean(),
    ]);

    const recommendedProducts = aiRecommendedProducts.length
      ? await getProductsByIds(aiRecommendedProducts.map((item) => item.product._id))
      : await getRecommendedForYou({ userId, limit: parsedLimit });

    let recentlyViewed = [];
    if (userId) {
      const views = await Event.find({ type: "PRODUCT_VIEW", "metadata.user": userId })
        .sort({ createdAt: -1 })
        .limit(parsedLimit * 3)
        .select("aggregateId")
        .lean();
      const ids = uniqueIds(views.map((view) => view.aggregateId).filter(Boolean));
      recentlyViewed = await getProductsByIds(ids.slice(0, parsedLimit));
    }

    return {
      trending_products: trendingProducts,
      recommended_products: recommendedProducts,
      popular_shops: popularShops,
      recently_viewed: recentlyViewed,
      flash_deals: flashDeals,
    };
  });
}

async function getProductRecommendations({ productId, userId, limit, trafficType = "marketplace", shopId = null }) {
  const parsedLimit = normalizeLimit(limit);
  const cacheKey = `rec:product:${productId}:${userId || "guest"}:${parsedLimit}`;

  return getCached(cacheKey, 1800, async () => {
    if (!isValidObjectId(productId)) {
      return {
        similar_products: [],
        customers_also_bought: [],
        more_from_this_shop: [],
      };
    }

    const product = await Product.findById(productId).select("shopId").lean();
    if (!product) {
      return {
        similar_products: [],
        customers_also_bought: [],
        more_from_this_shop: [],
      };
    }

    const [similarProducts, customersAlsoBought, moreFromThisShop] = await Promise.all([
      getSimilarProducts({ productId, limit: parsedLimit }),
      getCustomersAlsoBought({ productId, limit: parsedLimit }),
      getMoreFromShop({ shopId: product.shopId, excludeProductId: productId, limit: parsedLimit }),
    ]);

    if (trafficType === "direct") {
      const directShopId = shopId || product.shopId;
      const scoped = await getMoreFromShop({
        shopId: directShopId,
        excludeProductId: productId,
        limit: parsedLimit,
      });
      return {
        similar_products: [],
        customers_also_bought: [],
        more_from_this_shop: scoped,
      };
    }

    return {
      similar_products: similarProducts,
      customers_also_bought: customersAlsoBought,
      more_from_this_shop: moreFromThisShop,
    };
  });
}

async function getShopRecommendations({ shopId, location, limit, trafficType = "marketplace" }) {
  const parsedLimit = normalizeLimit(limit);
  const loc = parseLocation(location);
  const cacheKey = `rec:shop:${shopId}:${location || "na"}:${parsedLimit}`;

  return getCached(cacheKey, 1800, async () => {
    if (trafficType === "direct") {
      return {
        nearby_popular_shops: [],
        top_rated_shops: [],
      };
    }

    const [nearbyPopular, topRated] = await Promise.all([
      getNearbyPopularShops({ location: loc, limit: parsedLimit }),
      getTopRatedShops({ limit: parsedLimit }),
    ]);

    const excludeId = isValidObjectId(shopId) ? String(shopId) : null;
    const filteredNearby = excludeId
      ? nearbyPopular.filter((shop) => String(shop._id) !== excludeId)
      : nearbyPopular;
    const filteredTopRated = excludeId
      ? topRated.filter((shop) => String(shop._id) !== excludeId)
      : topRated;

    return {
      nearby_popular_shops: filteredNearby,
      top_rated_shops: filteredTopRated,
    };
  });
}

async function getTrendingRecommendations({ window, limit, trafficType = "marketplace", shopId = null }) {
  const parsedLimit = normalizeLimit(limit);
  const selectedWindow = WINDOWS[window] ? window : "7d";
  const cacheKey = `rec:trending:${selectedWindow}:${parsedLimit}`;

  return getCached(cacheKey, 1200, async () => {
    if (trafficType === "direct") {
      return { trending_products: await getScopedShopProducts(shopId, parsedLimit) };
    }
    const products = await getTrendingProducts({ window: selectedWindow, limit: parsedLimit });
    return { trending_products: products };
  });
}

module.exports = {
  getHomeRecommendations,
  getProductRecommendations,
  getShopRecommendations,
  getTrendingRecommendations,
};
