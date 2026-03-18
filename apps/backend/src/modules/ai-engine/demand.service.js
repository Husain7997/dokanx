const Order = require("../../models/order.model");
const Product = require("../../models/product.model");

function rangeDays(range) {
  const raw = String(range || "30");
  if (raw === "7d" || raw === "7") return 7;
  if (raw === "30d" || raw === "30") return 30;
  return 30;
}

async function getDemandForecast({ days = 30 } = {}) {
  const windowDays = rangeDays(days);
  const labels = [];
  const actual = [];
  const forecast = [];

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
    labels.push(start.toISOString().slice(5, 10));
    actual.push(value);
  }

  for (let i = 0; i < actual.length; i += 1) {
    const slice = actual.slice(Math.max(0, i - 6), i + 1);
    forecast.push(Number((slice.reduce((sum, item) => sum + item, 0) / Math.max(slice.length, 1)).toFixed(2)));
  }

  return { labels, actual, forecast };
}

async function getTrendingProducts({ limit = 10 } = {}) {
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

  return recent
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
}

async function getLowStockAlerts({ limit = 10 } = {}) {
  return Product.find({ stock: { $lte: 10 } })
    .sort({ stock: 1, updatedAt: -1 })
    .limit(limit)
    .select("_id name stock")
    .lean();
}

module.exports = {
  getDemandForecast,
  getTrendingProducts,
  getLowStockAlerts,
};
