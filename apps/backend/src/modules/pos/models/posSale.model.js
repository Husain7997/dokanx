const mongoose = require("mongoose");

const posSaleItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const posSaleSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    terminalId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    queueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PosSyncQueue",
      required: true,
      unique: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    customer: {
      phone: { type: String, default: "" },
      name: { type: String, default: "" },
    },
    items: {
      type: [posSaleItemSchema],
      default: [],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentTypes: {
      type: [String],
      default: [],
    },
    syncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

posSaleSchema.index({ shopId: 1, terminalId: 1, createdAt: -1 });

module.exports =
  mongoose.models.PosSale ||
  mongoose.model("PosSale", posSaleSchema);
