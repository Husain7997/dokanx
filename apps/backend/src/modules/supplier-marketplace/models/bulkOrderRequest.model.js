const mongoose = require("mongoose");

const lineSchema = new mongoose.Schema(
  {
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupplierOffer",
      required: true,
    },
    title: {
      type: String,
      default: "",
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const bulkOrderRequestSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED", "CANCELLED", "FULFILLED"],
      default: "PENDING",
      index: true,
    },
    lines: {
      type: [lineSchema],
      default: [],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    idempotencyKey: {
      type: String,
      default: null,
      trim: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

bulkOrderRequestSchema.index(
  { shopId: 1, idempotencyKey: 1 },
  { unique: true, sparse: true }
);

module.exports =
  mongoose.models.BulkOrderRequest ||
  mongoose.model("BulkOrderRequest", bulkOrderRequestSchema);
