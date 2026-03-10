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

const statusHistorySchema = new mongoose.Schema(
  {
    fromStatus: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED", "CANCELLED", "FULFILLED"],
      required: true,
    },
    toStatus: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED", "CANCELLED", "FULFILLED"],
      required: true,
    },
    action: {
      type: String,
      enum: ["ACCEPT", "REJECT", "FULFILL", "CANCEL"],
      required: true,
    },
    actorShopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
    },
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    at: {
      type: Date,
      default: Date.now,
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
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    fulfilledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

bulkOrderRequestSchema.index(
  { shopId: 1, idempotencyKey: 1 },
  { unique: true, sparse: true }
);
bulkOrderRequestSchema.index({ shopId: 1, status: 1, createdAt: -1 });
bulkOrderRequestSchema.index({ supplierId: 1, status: 1, createdAt: -1 });
bulkOrderRequestSchema.index({ shopId: 1, createdAt: -1 });
bulkOrderRequestSchema.index({ supplierId: 1, createdAt: -1 });

module.exports =
  mongoose.models.BulkOrderRequest ||
  mongoose.model("BulkOrderRequest", bulkOrderRequestSchema);
