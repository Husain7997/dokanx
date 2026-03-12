const ProductReview = require("./models/productReview.model");
const ShopReview = require("./models/shopReview.model");
const BuyerClaim = require("./models/buyerClaim.model");
const Order = require("@/models/order.model");
const Shop = require("@/models/shop.model");

function toFixedNumber(value, digits = 2) {
  return Number(Number(value || 0).toFixed(digits));
}

async function recalculateShopReputation(shopId) {
  const [ratingAgg, orderAgg] = await Promise.all([
    ShopReview.aggregate([
      { $match: { shopId } },
      {
        $group: {
          _id: "$shopId",
          averageRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate([
      { $match: { shopId } },
      {
        $group: {
          _id: "$shopId",
          totalOrders: { $sum: 1 },
          deliveredOrders: {
            $sum: {
              $cond: [{ $eq: ["$status", "DELIVERED"] }, 1, 0],
            },
          },
          cancelledOrders: {
            $sum: {
              $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0],
            },
          },
          returnedOrders: {
            $sum: {
              $cond: [{ $eq: ["$status", "RETURNED"] }, 1, 0],
            },
          },
        },
      },
    ]),
  ]);

  const rating = ratingAgg[0] || { averageRating: 0, reviewCount: 0 };
  const orderStats = orderAgg[0] || {
    totalOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    returnedOrders: 0,
  };

  const totalOrders = Number(orderStats.totalOrders || 0);
  const deliverySuccess = totalOrders ? Number(orderStats.deliveredOrders || 0) / totalOrders : 0;
  const cancellationRate = totalOrders ? Number(orderStats.cancelledOrders || 0) / totalOrders : 0;
  const returnRate = totalOrders ? Number(orderStats.returnedOrders || 0) / totalOrders : 0;
  const ratingScore = Math.min((Number(rating.averageRating || 0) / 5) * 100, 100);
  const trustScore = toFixedNumber(
    (deliverySuccess * 45) +
    (ratingScore * 0.35) +
    ((1 - cancellationRate) * 10) +
    ((1 - returnRate) * 10)
  );

  await Shop.findByIdAndUpdate(shopId, {
    $set: {
      ratingAverage: toFixedNumber(rating.averageRating || 0),
      ratingCount: Number(rating.reviewCount || 0),
      trustScore,
    },
  });

  return {
    shopId,
    ratingAverage: toFixedNumber(rating.averageRating || 0),
    ratingCount: Number(rating.reviewCount || 0),
    trustScore,
  };
}

async function createProductReview({ shopId, customerId, payload }) {
  const order = await Order.findOne({
    _id: payload.orderId,
    shopId,
    user: customerId,
    status: "DELIVERED",
  }).lean();

  if (!order) {
    const err = new Error("Delivered order not found for review");
    err.statusCode = 404;
    throw err;
  }

  return ProductReview.create({
    shopId,
    productId: payload.productId,
    customerId,
    orderId: payload.orderId,
    rating: Number(payload.rating),
    reviewText: String(payload.reviewText || "").trim(),
    images: Array.isArray(payload.images) ? payload.images : [],
  });
}

async function listProductReviews({ shopId, productId, limit = 20 }) {
  return ProductReview.find({ shopId, productId })
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 20, 1), 100))
    .lean();
}

async function createShopReview({ shopId, customerId, payload }) {
  const order = await Order.findOne({
    _id: payload.orderId,
    shopId,
    user: customerId,
    status: "DELIVERED",
  }).lean();

  if (!order) {
    const err = new Error("Delivered order not found for review");
    err.statusCode = 404;
    throw err;
  }

  const review = await ShopReview.create({
    shopId,
    customerId,
    orderId: payload.orderId,
    rating: Number(payload.rating),
    reviewText: String(payload.reviewText || "").trim(),
  });

  const reputation = await recalculateShopReputation(shopId);
  return { review, reputation };
}

async function getShopRating({ shopId }) {
  const shop = await Shop.findById(shopId).lean();
  if (!shop) {
    const err = new Error("Shop not found");
    err.statusCode = 404;
    throw err;
  }

  return {
    shopId,
    ratingAverage: Number(shop.ratingAverage || 0),
    ratingCount: Number(shop.ratingCount || 0),
    trustScore: Number(shop.trustScore || 0),
  };
}

async function createBuyerClaim({ shopId, customerId, payload }) {
  const order = await Order.findOne({
    _id: payload.orderId,
    shopId,
    user: customerId,
  }).lean();

  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  return BuyerClaim.create({
    shopId,
    orderId: payload.orderId,
    customerId,
    issueType: String(payload.issueType || "").trim().toUpperCase(),
    description: String(payload.description || "").trim(),
    status: "OPEN",
  });
}

async function listBuyerClaims({ shopId, status = null, limit = 50 }) {
  const query = { shopId };
  if (status) query.status = String(status).trim().toUpperCase();

  return BuyerClaim.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 50, 1), 200))
    .lean();
}

module.exports = {
  recalculateShopReputation,
  createProductReview,
  listProductReviews,
  createShopReview,
  getShopRating,
  createBuyerClaim,
  listBuyerClaims,
};
