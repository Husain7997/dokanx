const mongoose = require("mongoose");

const Product = require("../../models/product.model");
const Order = require("../../models/order.model");
const Shop = require("../../models/shop.model");
const ShopLocation = require("../../models/shopLocation.model");
const SearchQueryLog = require("../../models/searchQueryLog.model");
const Cart = require("../../models/cart.model");
const Event = require("../../models/event.model");
const cache = require("../../infrastructure/redis/cache.service");

const { WINDOWS, uniqueIds, isValidObjectId } = require("./recommendation.utils");

async function getCached(key, ttlSeconds, resolver) {
  const cached = await cache.get(key);
  if (cached) return cached;
  const fresh = await resolver();
  await cache.set(key, fresh, ttlSeconds);
  return fresh;
}

async function getProductsByIds(ids) {
  if (!ids.length) return [];
  const rows = await Product.find({
    _id: { $in: ids },
    isActive: true,
    moderationStatus: "APPROVED",
  })
    .select("_id name slug price discountRate shopId category brand popularityScore stock")
    .lean();

  const map = new Map(rows.map((row) => [String(row._id), row]));
  return ids.map((id) => map.get(String(id))).filter(Boolean);
}

async function getScopedShopProducts(shopId, limit) {
  if (!shopId) return [];
  return Product.find({
    shopId,
    isActive: true,
    moderationStatus: "APPROVED",
  })
    .sort({ popularityScore: -1, createdAt: -1 })
    .limit(limit)
    .select("_id name slug price discountRate shopId category brand popularityScore stock")
    .lean();
}

async function getShopsByIds(ids) {
  if (!ids.length) return [];
  const rows = await Shop.find({ _id: { $in: ids }, isActive: true, status: "ACTIVE" })
    .select("_id name slug logoUrl city country trustScore popularityScore")
    .lean();

  const map = new Map(rows.map((row) => [String(row._id), row]));
  return ids.map((id) => map.get(String(id))).filter(Boolean);
}

async function aggregateTopProductsByOrders({ days, limit }) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: since },
        status: { $nin: ["CANCELLED", "REFUNDED"] },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        orderCount: { $sum: "$items.quantity" },
      },
    },
    { $sort: { orderCount: -1 } },
    { $limit: limit },
  ]);

  return rows.map((row) => ({ productId: row._id, orderCount: row.orderCount || 0 }));
}

async function aggregateTopShopsByOrders({ days, limit }) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: since },
        status: { $nin: ["CANCELLED", "REFUNDED"] },
      },
    },
    {
      $group: {
        _id: "$shopId",
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { orderCount: -1 } },
    { $limit: limit },
  ]);

  return rows.map((row) => ({ shopId: row._id, orderCount: row.orderCount || 0 }));
}

async function getTrendingProducts({ window, limit }) {
  const days = WINDOWS[window] || WINDOWS["7d"];
  const topByOrders = await aggregateTopProductsByOrders({ days, limit: limit * 2 });
  const productIds = topByOrders.map((row) => row.productId);
  const products = await getProductsByIds(productIds);

  const orderCountMap = new Map(topByOrders.map((row) => [String(row.productId), row.orderCount]));
  return products
    .map((product) => ({
      ...product,
      orderCount: orderCountMap.get(String(product._id)) || 0,
    }))
    .slice(0, limit);
}

async function getPopularProducts({ limit }) {
  const topByOrders = await aggregateTopProductsByOrders({ days: 30, limit: limit * 3 });
  const topOrderIds = topByOrders.map((row) => row.productId);
  const productsByOrders = await getProductsByIds(topOrderIds);

  const orderCountMap = new Map(topByOrders.map((row) => [String(row.productId), row.orderCount]));

  const scored = productsByOrders.map((product) => {
    const orderScore = orderCountMap.get(String(product._id)) || 0;
    const popularityScore = Number(product.popularityScore || 0);
    return {
      ...product,
      score: orderScore * 2 + popularityScore,
      orderCount: orderScore,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  if (scored.length >= limit) return scored.slice(0, limit);

  const fallback = await Product.find({ isActive: true, moderationStatus: "APPROVED" })
    .sort({ popularityScore: -1, createdAt: -1 })
    .limit(limit)
    .select("_id name slug price discountRate shopId category brand popularityScore stock")
    .lean();

  const combined = uniqueIds([
    ...scored.map((item) => item._id),
    ...fallback.map((item) => item._id),
  ]);

  return getProductsByIds(combined).then((rows) => rows.slice(0, limit));
}

async function getSimilarProducts({ productId, limit }) {
  if (!isValidObjectId(productId)) return [];
  const product = await Product.findById(productId)
    .select("_id category brand price shopId")
    .lean();
  if (!product) return [];

  const priceMin = product.price ? product.price * 0.8 : 0;
  const priceMax = product.price ? product.price * 1.2 : Number.MAX_SAFE_INTEGER;

  return Product.find({
    _id: { $ne: product._id },
    isActive: true,
    moderationStatus: "APPROVED",
    $or: [
      product.category ? { category: product.category } : null,
      product.brand ? { brand: product.brand } : null,
      { price: { $gte: priceMin, $lte: priceMax } },
    ].filter(Boolean),
  })
    .sort({ popularityScore: -1, createdAt: -1 })
    .limit(limit)
    .select("_id name slug price discountRate shopId category brand popularityScore stock")
    .lean();
}

async function getCustomersAlsoBought({ productId, limit }) {
  if (!isValidObjectId(productId)) return [];
  const objectId = mongoose.Types.ObjectId(productId);
  const rows = await Order.aggregate([
    {
      $match: {
        "items.product": objectId,
        status: { $nin: ["CANCELLED", "REFUNDED"] },
      },
    },
    { $unwind: "$items" },
    {
      $match: {
        "items.product": { $ne: objectId },
      },
    },
    {
      $group: {
        _id: "$items.product",
        count: { $sum: "$items.quantity" },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit * 2 },
  ]);

  const productIds = rows.map((row) => row._id);
  const products = await getProductsByIds(productIds);
  return products.slice(0, limit);
}

async function getMoreFromShop({ shopId, excludeProductId, limit }) {
  return Product.find({
    shopId,
    _id: { $ne: excludeProductId },
    isActive: true,
    moderationStatus: "APPROVED",
  })
    .sort({ popularityScore: -1, createdAt: -1 })
    .limit(limit)
    .select("_id name slug price discountRate shopId category brand popularityScore stock")
    .lean();
}

async function buildUserPreferenceSignals({ userId }) {
  if (!userId) return { categories: [], brands: [], orderedProductIds: [] };

  const [searchLogs, cart, recentOrders, recentViews] = await Promise.all([
    SearchQueryLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("query")
      .lean(),
    Cart.findOne({ userId }).select("items.productId").lean(),
    Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(8)
      .select("items.product")
      .lean(),
    Event.find({ type: "PRODUCT_VIEW", "metadata.user": userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("aggregateId")
      .lean(),
  ]);

  const orderedProductIds = uniqueIds(
    recentOrders.flatMap((order) => order.items.map((item) => item.product))
  );
  const cartProductIds = uniqueIds((cart?.items || []).map((item) => item.productId));
  const viewedProductIds = uniqueIds(
    (recentViews || []).map((event) => event.aggregateId).filter(Boolean)
  );

  const signalProductIds = uniqueIds([
    ...orderedProductIds,
    ...cartProductIds,
    ...viewedProductIds,
  ]);

  let categories = [];
  let brands = [];

  if (signalProductIds.length) {
    const products = await Product.find({ _id: { $in: signalProductIds } })
      .select("category brand")
      .lean();

    const categoryCounts = new Map();
    const brandCounts = new Map();

    products.forEach((product) => {
      if (product.category) {
        categoryCounts.set(product.category, (categoryCounts.get(product.category) || 0) + 1);
      }
      if (product.brand) {
        brandCounts.set(product.brand, (brandCounts.get(product.brand) || 0) + 1);
      }
    });

    categories = [...categoryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value]) => value)
      .slice(0, 3);

    brands = [...brandCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value]) => value)
      .slice(0, 3);
  }

  const queries = searchLogs
    .map((log) => String(log.query || "").trim())
    .filter((value) => value.length >= 2)
    .slice(0, 5);

  return {
    categories,
    brands,
    queries,
    orderedProductIds,
    cartProductIds,
    viewedProductIds,
  };
}

async function getPopularShops({ limit }) {
  const topByOrders = await aggregateTopShopsByOrders({ days: 30, limit: limit * 2 });
  const shopIds = topByOrders.map((row) => row.shopId);
  const shops = await getShopsByIds(shopIds);

  if (shops.length >= limit) return shops.slice(0, limit);

  const fallback = await Shop.find({ isActive: true, status: "ACTIVE" })
    .sort({ popularityScore: -1, trustScore: -1, createdAt: -1 })
    .limit(limit)
    .select("_id name slug logoUrl city country trustScore popularityScore")
    .lean();

  const combined = uniqueIds([
    ...shops.map((item) => item._id),
    ...fallback.map((item) => item._id),
  ]);

  return getShopsByIds(combined).then((rows) => rows.slice(0, limit));
}

async function getNearbyPopularShops({ location, limit }) {
  if (!location) return getPopularShops({ limit });

  const { lat, lng } = location;
  const maxDistance = 30000;

  const rows = await ShopLocation.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distance",
        spherical: true,
        maxDistance,
        query: { isActive: true },
      },
    },
    {
      $group: {
        _id: "$shopId",
        distance: { $min: "$distance" },
      },
    },
    { $limit: limit * 2 },
  ]);

  const shopIds = rows.map((row) => row._id);
  const shops = await getShopsByIds(shopIds);
  return shops.slice(0, limit);
}

async function getTopRatedShops({ limit }) {
  return Shop.find({ isActive: true, status: "ACTIVE" })
    .sort({ trustScore: -1, popularityScore: -1 })
    .limit(limit)
    .select("_id name slug logoUrl city country trustScore popularityScore")
    .lean();
}

module.exports = {
  getCached,
  getProductsByIds,
  getScopedShopProducts,
  getShopsByIds,
  aggregateTopProductsByOrders,
  aggregateTopShopsByOrders,
  getTrendingProducts,
  getPopularProducts,
  getSimilarProducts,
  getCustomersAlsoBought,
  getMoreFromShop,
  buildUserPreferenceSignals,
  getPopularShops,
  getNearbyPopularShops,
  getTopRatedShops,
};
