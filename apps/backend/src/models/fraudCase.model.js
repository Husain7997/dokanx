const mongoose = require("mongoose");

const fraudSignalSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    label: { type: String, required: true },
    weight: { type: Number, required: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
    threshold: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const fraudActionSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    note: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const fraudCaseSchema = new mongoose.Schema(
  {
    caseKey: { type: String, required: true, unique: true, index: true },
    entityType: { type: String, enum: ["order", "payment"], required: true, index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null, index: true },
    paymentAttemptId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentAttempt", default: null, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", default: null, index: true },
    score: { type: Number, default: 0, index: true },
    level: { type: String, enum: ["safe", "medium", "high"], default: "safe", index: true },
    status: {
      type: String,
      enum: ["CLEARED", "OPEN", "REVIEW_REQUIRED", "INVESTIGATING", "ACTION_TAKEN", "DISMISSED"],
      default: "OPEN",
      index: true,
    },
    reviewRequired: { type: Boolean, default: false },
    source: { type: String, default: "manual_check" },
    summary: { type: String, default: "" },
    signals: { type: [fraudSignalSchema], default: [] },
    recommendedActions: { type: [String], default: [] },
    reviewActions: { type: [fraudActionSchema], default: [] },
    context: { type: Object, default: null },
    metrics: { type: Object, default: null },
    lastReviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewNote: { type: String, default: "" },
    lastEvaluatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.FraudCase ||
  mongoose.model("FraudCase", fraudCaseSchema);
