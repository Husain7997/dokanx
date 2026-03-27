const ProductReview = require("../../models/productReview.model");
const ShopLocation = require("../../models/shopLocation.model");

const { haversineKm } = require("./search.utils");

async function buildProductRatings(productIds) {
  if (!productIds.length) return new Map();
  const rows = await ProductReview.aggregate([
    { $match: { productId: { $in: productIds }, status: "APPROVED" } },
    { $group: { _id: "$productId", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const map = new Map();
  rows.forEach((row) => {
    map.set(String(row._id), { avgRating: row.avgRating || 0, count: row.count || 0 });
  });
  return map;
}

async function buildShopRatings(shopIds) {
  if (!shopIds.length) return new Map();
  const rows = await ProductReview.aggregate([
    { $match: { shopId: { $in: shopIds }, status: "APPROVED" } },
    { $group: { _id: "$shopId", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const map = new Map();
  rows.forEach((row) => {
    map.set(String(row._id), { avgRating: row.avgRating || 0, count: row.count || 0 });
  });
  return map;
}

async function buildShopDistances(shopIds, lat, lng) {
  if (!shopIds.length || lat == null || lng == null) return new Map();
  const locations = await ShopLocation.find({
    shopId: { $in: shopIds },
    isActive: true,
  }).lean();
  const map = new Map();
  locations.forEach((location) => {
    const coords = location.coordinates?.coordinates || [];
    if (coords.length < 2) return;
    const distanceKm = haversineKm(lat, lng, Number(coords[1]), Number(coords[0]));
    const key = String(location.shopId);
    const current = map.get(key);
    if (current == null || distanceKm < current) {
      map.set(key, distanceKm);
    }
  });
  return map;
}

module.exports = {
  buildProductRatings,
  buildShopRatings,
  buildShopDistances,
};
