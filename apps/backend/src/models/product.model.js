const mongoose = require("mongoose");

const productProtectionSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },
    durationDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    type: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: "",
      index: true,
    },
    brand: {
      type: String,
      default: "",
      index: true,
    },
    slug: {
      type: String,
      default: null,
      index: true,
    },
    barcode: {
      type: String,
      default: null,
      index: true,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    productionDate: {
      type: Date,
      default: null,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    price: {
      type: Number,
      required: true,
    },
    costPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    popularityScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    reserved: {
      type: Number,
      default: 0,
      min: 0,
    },
    inventoryVersion: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    moderationStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "FLAGGED"],
      default: "PENDING",
      index: true,
    },
    moderationNote: {
      type: String,
      default: "",
    },
    reconciledAt: Date,
    isReconciling: {
      type: Boolean,
      default: false,
    },
    warranty: {
      type: productProtectionSchema,
      default: () => ({
        enabled: false,
        durationDays: 0,
        type: "service",
      }),
    },
    guarantee: {
      type: productProtectionSchema,
      default: () => ({
        enabled: false,
        durationDays: 0,
        type: "replacement",
      }),
    },
  },
  { timestamps: true }
);

productSchema.index({ shopId: 1, name: 1 });
productSchema.index({ shopId: 1, createdAt: -1 });
productSchema.index({ shopId: 1, slug: 1 });
productSchema.index({ shopId: 1, barcode: 1 });

module.exports = mongoose.models.Product || mongoose.model("Product", productSchema);
