const mongoose = require("mongoose");

const evidenceSchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      default: null,
    },
    note: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const warrantyClaimSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["warranty", "guarantee"],
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "resolved"],
      default: "pending",
      index: true,
    },
    resolutionType: {
      type: String,
      enum: ["repair", "replacement", "refund", null],
      default: null,
    },
    evidence: {
      type: [evidenceSchema],
      default: [],
    },
    protectionSnapshot: {
      enabled: { type: Boolean, default: false },
      durationDays: { type: Number, default: 0 },
      type: { type: String, default: null },
      expiryDate: { type: Date, default: null },
    },
    fraudFlags: {
      type: [String],
      default: [],
    },
    internalReplacementOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    serviceTicketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WarrantyServiceTicket",
      default: null,
    },
    refundReferenceId: {
      type: String,
      default: null,
    },
    decisionNote: {
      type: String,
      default: "",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

warrantyClaimSchema.index({ orderId: 1, productId: 1, type: 1 });
warrantyClaimSchema.index({ customerId: 1, createdAt: -1 });
warrantyClaimSchema.index({ shopId: 1, status: 1, createdAt: -1 });

module.exports =
  mongoose.models.WarrantyClaim ||
  mongoose.model("WarrantyClaim", warrantyClaimSchema);
