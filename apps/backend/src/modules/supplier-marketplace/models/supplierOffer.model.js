const mongoose = require("mongoose");

const supplierOfferSchema = new mongoose.Schema(
  {
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    productName: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    brand: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    category: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    barcode: {
      type: String,
      default: "",
      trim: true,
    },
    unit: {
      type: String,
      default: "pcs",
      trim: true,
    },
    wholesalePrice: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    minOrderQty: {
      type: Number,
      default: 1,
      min: 1,
    },
    availableQty: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    leadTimeDays: {
      type: Number,
      default: 1,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

supplierOfferSchema.index({ supplierId: 1, isActive: 1, updatedAt: -1 });
supplierOfferSchema.index({ category: 1, brand: 1, wholesalePrice: 1 });
supplierOfferSchema.index({ title: "text", productName: "text", brand: "text", category: "text" });

module.exports =
  mongoose.models.SupplierOffer ||
  mongoose.model("SupplierOffer", supplierOfferSchema);
