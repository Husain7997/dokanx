const AiFeatureSnapshot = require("../../../models/aiFeatureSnapshot.model");
const CreditSale = require("../../credit-engine/creditSale.model");
const Event = require("../../../models/event.model");
const Order = require("../../../models/order.model");
const Product = require("../../../models/product.model");
const ProductReview = require("../../../models/productReview.model");
const SearchQueryLog = require("../../../models/searchQueryLog.model");
const Shop = require("../../../models/shop.model");
const User = require("../../../models/user.model");
const WarrantyClaim = require("../../warranty-engine/warrantyClaim.model");
const cache = require("../../../infrastructure/redis/cache.service");

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

async function withCache(key, ttl, resolver) {
  const cached = await cache.get(key);
  if (cached) return cached;
  const value = await resolver();
  await cache.set(key, value, ttl);
  return value;
}

async function buildCustomerFeatures(userId) {
  const [orders, searchLogs, creditSales] = await Promise.all([
    Order.find({ customerId: userId }).select("items totalAmount createdAt paymentStatus status").lean(),
    SearchQueryLog.find({ userId }).sort({ createdAt: -1 }).limit(20).select("query createdAt").lean(),
    CreditSale.find({ customerId: userId }).select("amount outstandingAmount status createdAt").lean(),
  ]);

  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  const avgOrderValue = totalOrders ? totalSpent / totalOrders : 0;
  const productIds = orders.flatMap((order) => (order.items || []).map((item) => item.product)).filter(Boolean);
  const products = productIds.length
    ? await Product.find({ _id: { $in: productIds } }).select("_id category").lean()
    : [];
  const productCategoryMap = new Map(products.map((product) => [String(product._id), product.category]));
  const categoryCounts = new Map();
  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const category = productCategoryMap.get(String(item.product));
      if (category) {
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + Number(item.quantity || 1));
      }
    });
  });
  const lastActive =
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.createdAt ||
    searchLogs[0]?.createdAt ||
    null;
  const totalCredit = creditSales.reduce((sum, sale) => sum + Number(sale.amount || 0), 0);
  const outstandingCredit = creditSales.reduce((sum, sale) => sum + Number(sale.outstandingAmount || 0), 0);
  const paymentReliability =
    totalOrders > 0
      ? orders.filter((order) => ["SUCCESS", "PENDING"].includes(String(order.paymentStatus || ""))).length / totalOrders
      : 1;
  const creditScore = clamp(
    50 +
      Math.min(25, totalOrders * 2) +
      Math.round(paymentReliability * 20) -
      Math.round((outstandingCredit / Math.max(totalCredit || 1, 1)) * 20)
  );

  return {
    totalOrders,
    totalSpent: Number(totalSpent.toFixed(2)),
    avgOrderValue: Number(avgOrderValue.toFixed(2)),
    preferredCategories: [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([category]) => category),
    lastActive,
    creditScore,
    searchQueries: searchLogs.map((row) => row.query).filter(Boolean).slice(0, 10),
    outstandingCredit: Number(outstandingCredit.toFixed(2)),
    paymentReliability: Number(paymentReliability.toFixed(4)),
  };
}

async function buildProductFeatures(productId) {
  const [orders, views, claims] = await Promise.all([
    Order.find({ "items.product": productId }).select("items status createdAt").lean(),
    Event.countDocuments({ type: "PRODUCT_VIEW", aggregateId: productId }),
    WarrantyClaim.find({ productId }).select("status resolutionType").lean(),
  ]);

  const totalSales = orders.reduce((sum, order) => {
    const item = (order.items || []).find((entry) => String(entry.product) === String(productId));
    return sum + Number(item?.quantity || 0);
  }, 0);
  const completedOrders = orders.filter((order) => !["CANCELLED", "REFUNDED"].includes(String(order.status || ""))).length;
  const conversionRate = views > 0 ? completedOrders / views : 0;
  const refundClaims = claims.filter((claim) => claim.resolutionType === "refund").length;
  const returnRate = totalSales > 0 ? refundClaims / totalSales : 0;
  const popularityScore = clamp(Math.round(totalSales * 2 + views * 0.2 - refundClaims * 5));

  return {
    totalSales,
    conversionRate: Number(conversionRate.toFixed(4)),
    returnRate: Number(returnRate.toFixed(4)),
    popularityScore,
    claimCount: claims.length,
    views,
  };
}

async function buildShopFeatures(shopId) {
  const [orders, claims, reviews] = await Promise.all([
    Order.find({ shopId }).select("status").lean(),
    WarrantyClaim.find({ shopId }).select("status").lean(),
    ProductReview.find({ shopId, status: "APPROVED" }).select("rating").lean(),
  ]);

  const totalOrders = orders.length;
  const delivered = orders.filter((order) => order.status === "DELIVERED").length;
  const fulfillmentRate = totalOrders ? delivered / totalOrders : 0;
  const claimRate = totalOrders ? claims.length / totalOrders : 0;
  const ratingScore = reviews.length
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
    : 0;

  return {
    totalOrders,
    fulfillmentRate: Number(fulfillmentRate.toFixed(4)),
    claimRate: Number(claimRate.toFixed(4)),
    ratingScore: Number(ratingScore.toFixed(2)),
  };
}

async function storeSnapshot(featureType, entityId, features) {
  const explanations = Object.entries(features)
    .slice(0, 6)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`);

  return AiFeatureSnapshot.findOneAndUpdate(
    { featureType, entityId, snapshotDate: todayKey() },
    { featureType, entityId, snapshotDate: todayKey(), features, explanations },
    { new: true, upsert: true }
  );
}

async function getSnapshot(featureType, entityId, builder) {
  const cacheKey = `ai:features:${featureType}:${entityId}:${todayKey()}`;
  return withCache(cacheKey, 86400, async () => {
    const existing = await AiFeatureSnapshot.findOne({ featureType, entityId, snapshotDate: todayKey() }).lean();
    if (existing) return existing;
    const features = await builder(entityId);
    const snapshot = await storeSnapshot(featureType, entityId, features);
    return snapshot.toObject ? snapshot.toObject() : snapshot;
  });
}

async function getCustomerSnapshot(userId) {
  return getSnapshot("customer", userId, buildCustomerFeatures);
}

async function getProductSnapshot(productId) {
  return getSnapshot("product", productId, buildProductFeatures);
}

async function getShopSnapshot(shopId) {
  return getSnapshot("shop", shopId, buildShopFeatures);
}

async function buildDailySnapshots() {
  const [customers, products, shops] = await Promise.all([
    User.find({ role: "CUSTOMER" }).select("_id").lean(),
    Product.find({}).select("_id").lean(),
    Shop.find({}).select("_id").lean(),
  ]);

  for (const customer of customers) await storeSnapshot("customer", customer._id, await buildCustomerFeatures(customer._id));
  for (const product of products) await storeSnapshot("product", product._id, await buildProductFeatures(product._id));
  for (const shop of shops) await storeSnapshot("shop", shop._id, await buildShopFeatures(shop._id));

  return { customers: customers.length, products: products.length, shops: shops.length };
}

async function getTopCustomerSnapshots(limit = 10) {
  return AiFeatureSnapshot.find({ featureType: "customer", snapshotDate: todayKey() })
    .sort({ "features.totalSpent": -1 })
    .limit(limit)
    .lean();
}

async function getRiskyCustomerSnapshots(limit = 10) {
  return AiFeatureSnapshot.find({ featureType: "customer", snapshotDate: todayKey() })
    .sort({ "features.creditScore": 1, "features.outstandingCredit": -1 })
    .limit(limit)
    .lean();
}

module.exports = {
  buildDailySnapshots,
  getCustomerSnapshot,
  getProductSnapshot,
  getShopSnapshot,
  getTopCustomerSnapshots,
  getRiskyCustomerSnapshots,
};
