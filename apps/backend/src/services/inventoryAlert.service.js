const Inventory = require("@/models/Inventory.model");
const Product = require("@/models/product.model");

function toPositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.floor(parsed));
}

async function listLowStockAlerts({ shopId, filters = {} }) {
  const threshold = toPositiveInteger(filters.threshold, 5);
  const limit = Math.min(toPositiveInteger(filters.limit, 50), 200);

  const rows = await Inventory.aggregate([
    {
      $match: {
        shopId,
        isActive: true,
      },
    },
    {
      $project: {
        product: 1,
        stock: { $ifNull: ["$stock", 0] },
        reserved: { $ifNull: ["$reserved", 0] },
        availableStock: {
          $subtract: [
            { $ifNull: ["$stock", 0] },
            { $ifNull: ["$reserved", 0] },
          ],
        },
        updatedAt: 1,
      },
    },
    {
      $match: {
        availableStock: { $lte: threshold },
      },
    },
    {
      $lookup: {
        from: Product.collection.name,
        localField: "product",
        foreignField: "_id",
        as: "productDoc",
      },
    },
    {
      $unwind: {
        path: "$productDoc",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        productId: "$product",
        productName: { $ifNull: ["$productDoc.name", "Unknown Product"] },
        barcode: { $ifNull: ["$productDoc.barcode", ""] },
        category: { $ifNull: ["$productDoc.category", ""] },
        stock: 1,
        reserved: 1,
        availableStock: 1,
        threshold: { $literal: threshold },
        severity: {
          $cond: [{ $lte: ["$availableStock", 0] }, "OUT", "LOW"],
        },
        updatedAt: 1,
      },
    },
    {
      $sort: {
        availableStock: 1,
        updatedAt: -1,
      },
    },
    {
      $limit: limit,
    },
  ]);

  return rows;
}

module.exports = {
  listLowStockAlerts,
};
