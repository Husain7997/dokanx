const mongoose = require("mongoose");

const warehouseStockSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    available: {
      type: Number,
      default: 0,
      min: 0,
    },
    reserved: {
      type: Number,
      default: 0,
      min: 0,
    },
    reorderPoint: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastSoldAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

warehouseStockSchema.index({ shopId: 1, warehouseId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model("WarehouseStock", warehouseStockSchema);
