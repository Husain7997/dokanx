const Order = require("../../models/order.model");
const Product = require("../../models/product.model");
const cache = require("../../infrastructure/redis/cache.service");

function rangeDays(range) {
  const raw = String(range || "30");
  if (raw === "7d" || raw === "7") return 7;
  if (raw === "30d" || raw === "30") return 30;
  return 30;
}

async function getDemandForecast({ days = 30 } = {}) {
  const windowDays = rangeDays(days);
  const cacheKey = `ai:demand:${windowDays}`;
  const cached = await cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const labels = [];
  const actual = [];
  const forecast = [];
  const weekdayBuckets = new Map();
  const eventFlags = [];

  for (let offset = windowDays - 1; offset >= 0; offset -= 1) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - offset);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const rows = await Order.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end }, status: { $nin: ["CANCELLED", "REFUNDED"] } } },
      { $group: { _id: null, amount: { $sum: "$totalAmount" } } },
    ]);
    const value = Number(rows[0]?.amount || 0);
    const weekday = start.getDay();
    labels.push(start.toISOString().slice(5, 10));
    actual.push(value);
    const bucket = weekdayBuckets.get(weekday) || [];
    bucket.push(value);
    weekdayBuckets.set(weekday, bucket);

    const month = start.getMonth() + 1;
    if ((month === 3 || month === 4) && !eventFlags.includes("seasonal_festival_window")) {
      eventFlags.push("seasonal_festival_window");
    }
  }

  for (let i = 0; i < actual.length; i += 1) {
    const slice = actual.slice(Math.max(0, i - 6), i + 1);
    const baseline = slice.reduce((sum, item) => sum + item, 0) / Math.max(slice.length, 1);
    const weekday = new Date(new Date().setDate(new Date().getDate() - (actual.length - 1 - i))).getDay();
    const weekdayAverage = (weekdayBuckets.get(weekday) || []).reduce((sum, item) => sum + item, 0) /
      Math.max((weekdayBuckets.get(weekday) || []).length, 1);
    const anomalyBoost = actual[i] > baseline * 1.8 ? 0.15 : 0;
    const eventBoost = eventFlags.length ? 0.05 : 0;
    const projection = baseline * 0.75 + weekdayAverage * 0.25;
    forecast.push(Number((projection * (1 + anomalyBoost + eventBoost)).toFixed(2)));
  }

  const result = { labels, actual, forecast };
  await cache.set(cacheKey, result, 900);
  return result;
}

async function getTrendingProducts({ limit = 10 } = {}) {
  const cacheKey = `ai:trending:${limit}`;
  const cached = await cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [recent, older] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: { $gte: since7 }, status: { $nin: ["CANCELLED", "REFUNDED"] } } },
      { $unwind: "$items" },
      { $group: { _id: "$items.product", quantity: { $sum: "$items.quantity" } } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: since30, $lt: since7 }, status: { $nin: ["CANCELLED", "REFUNDED"] } } },
      { $unwind: "$items" },
      { $group: { _id: "$items.product", quantity: { $sum: "$items.quantity" } } },
    ]),
  ]);
  const previousMap = new Map(older.map((row) => [String(row._id), Number(row.quantity || 0)]));
  const productIds = recent.map((row) => row._id);
  const products = await Product.find({ _id: { $in: productIds } }).select("_id name stock").lean();
  const productMap = new Map(products.map((row) => [String(row._id), row]));

  const result = recent
    .map((row) => {
      const previous = previousMap.get(String(row._id)) || 0;
      const velocity = previous ? Number(row.quantity || 0) / previous : Number(row.quantity || 0);
      return {
        name: productMap.get(String(row._id))?.name || "Product",
        velocity: Number(velocity.toFixed(2)),
        location: "platform",
        changeLabel: previous ? `${Math.round((velocity - 1) * 100)}% vs prior` : "new demand",
        stock: Number(productMap.get(String(row._id))?.stock || 0),
      };
    })
    .sort((a, b) => b.velocity - a.velocity)
    .slice(0, limit);
  await cache.set(cacheKey, result, 600);
  return result;
}

async function getLowStockAlerts({ limit = 10 } = {}) {
  const cacheKey = `ai:low-stock:${limit}`;
  const cached = await cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const result = await Product.find({ stock: { $lte: 10 } })
    .sort({ stock: 1, updatedAt: -1 })
    .limit(limit)
    .select("_id name stock")
    .lean();
  await cache.set(cacheKey, result, 300);
  return result;
}

module.exports = {
  getDemandForecast,
  getTrendingProducts,
  getLowStockAlerts,
};
