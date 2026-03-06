const Product = require("@/models/product.model");
const Shop = require("@/models/shop.model");

function toNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseRegexQuery(q) {
  const term = String(q || "").trim();
  if (!term) return null;
  return new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

function buildShopScore({ distanceKm, ratingAverage, inStockCount }) {
  const distanceScore = Math.max(0, 100 - Math.min(distanceKm * 8, 100));
  const ratingScore = Math.min((Number(ratingAverage || 0) / 5) * 30, 30);
  const stockScore = Math.min(Number(inStockCount || 0), 20);
  return Number((distanceScore + ratingScore + stockScore).toFixed(2));
}

function buildProductScore({ distanceKm, ratingAverage, stock, price }) {
  const distanceScore = Math.max(0, 100 - Math.min(distanceKm * 8, 100));
  const ratingScore = Math.min((Number(ratingAverage || 0) / 5) * 20, 20);
  const stockScore = Math.min(Number(stock || 0), 15);
  const priceScore = Math.max(0, 25 - Math.min(Number(price || 0) / 200, 25));
  return Number((distanceScore + ratingScore + stockScore + priceScore).toFixed(2));
}

async function getNearbyShops({ lat, lng, radiusKm = 10, limit = 200 }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];

  const radiusMeters = Math.max(radiusKm, 0.5) * 1000;

  return Shop.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distanceMeters",
        maxDistance: radiusMeters,
        spherical: true,
      },
    },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        name: 1,
        status: 1,
        ratingAverage: 1,
        ratingCount: 1,
        location: 1,
        distanceMeters: 1,
      },
    },
  ]);
}

async function searchShops({
  q,
  lat,
  lng,
  radiusKm = 10,
  limit = 20,
}) {
  const regex = parseRegexQuery(q);
  const nearby = await getNearbyShops({ lat, lng, radiusKm, limit: 500 });

  if (nearby.length) {
    const nearMap = new Map(nearby.map(s => [String(s._id), s]));
    const ids = nearby.map(s => s._id);

    const shopsWithStock = await Product.aggregate([
      {
        $match: {
          shopId: { $in: ids },
          isActive: true,
          stock: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: "$shopId",
          inStockCount: { $sum: 1 },
          minPrice: { $min: "$price" },
        },
      },
    ]);

    const stockMap = new Map(shopsWithStock.map(s => [String(s._id), s]));

    const filtered = nearby
      .filter(s => s.status !== "SUSPENDED")
      .filter(s => {
        if (!regex) return true;
        return regex.test(s.name || "");
      })
      .map(s => {
        const stock = stockMap.get(String(s._id)) || {
          inStockCount: 0,
          minPrice: null,
        };
        const distanceKm = Number((s.distanceMeters / 1000).toFixed(2));
        const score = buildShopScore({
          distanceKm,
          ratingAverage: s.ratingAverage,
          inStockCount: stock.inStockCount,
        });

        return {
          _id: s._id,
          name: s.name,
          status: s.status,
          ratingAverage: s.ratingAverage || 0,
          ratingCount: s.ratingCount || 0,
          location: s.location,
          distanceKm,
          inStockCount: stock.inStockCount || 0,
          minPrice: stock.minPrice ?? null,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return filtered;
  }

  const fallbackQuery = {
    status: { $ne: "SUSPENDED" },
    ...(regex ? { name: regex } : {}),
  };
  const shops = await Shop.find(fallbackQuery)
    .sort({ ratingAverage: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  return shops.map(s => ({
    _id: s._id,
    name: s.name,
    status: s.status,
    ratingAverage: s.ratingAverage || 0,
    ratingCount: s.ratingCount || 0,
    location: s.location || null,
    distanceKm: null,
    inStockCount: null,
    minPrice: null,
    score: Number(((s.ratingAverage || 0) * 10).toFixed(2)),
  }));
}

async function searchProducts({
  q,
  lat,
  lng,
  radiusKm = 10,
  limit = 20,
}) {
  const regex = parseRegexQuery(q);
  const nearby = await getNearbyShops({ lat, lng, radiusKm, limit: 300 });
  const nearbyMap = new Map(nearby.map(s => [String(s._id), s]));
  const nearbyIds = nearby.map(s => s._id);

  const match = {
    isActive: true,
    ...(regex
      ? {
          $or: [
            { name: regex },
            { brand: regex },
            { category: regex },
            { barcode: regex },
          ],
        }
      : {}),
    ...(nearbyIds.length ? { shopId: { $in: nearbyIds } } : {}),
  };

  const products = await Product.find(match)
    .sort({ stock: -1, createdAt: -1 })
    .limit(limit * 5)
    .lean();

  const rows = products
    .map(p => {
      const shop = nearbyMap.get(String(p.shopId));
      const distanceKm = shop ? Number((shop.distanceMeters / 1000).toFixed(2)) : null;
      const ratingAverage = shop?.ratingAverage || 0;

      const score = buildProductScore({
        distanceKm: distanceKm ?? 20,
        ratingAverage,
        stock: p.stock,
        price: p.price,
      });

      return {
        _id: p._id,
        shopId: p.shopId,
        name: p.name,
        brand: p.brand || "",
        category: p.category || "",
        barcode: p.barcode || "",
        imageUrl: p.imageUrl || "",
        price: p.price,
        stock: p.stock,
        ratingAverage,
        distanceKm,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return rows;
}

module.exports = {
  searchShops,
  searchProducts,
  toNumber,
};
