const mongoose = require("mongoose");

const financeExceptionTimelineSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const financeExceptionSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
      index: true,
    },
    scopeType: {
      type: String,
      enum: ["SYSTEM", "SHOP", "SETTLEMENT", "PAYOUT", "WALLET"],
      default: "SYSTEM",
      index: true,
    },
    scopeRef: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "SETTLEMENT_DRIFT",
        "PAYOUT_FAILURE",
        "WALLET_DRIFT",
        "DOUBLE_LEDGER_RISK",
        "IDEMPOTENCY_REPLAY",
      ],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
      index: true,
    },
    status: {
      type: String,
      enum: ["OPEN", "INVESTIGATING", "RESOLVED"],
      default: "OPEN",
      index: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    detectedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    timeline: {
      type: [financeExceptionTimelineSchema],
      default: [],
    },
  },
  { timestamps: true }
);

financeExceptionSchema.index(
  { shopId: 1, type: 1, scopeRef: 1, status: 1 },
  { name: "finance_exception_lookup_idx" }
);

module.exports =
  mongoose.models.FinanceException ||
  mongoose.model("FinanceException", financeExceptionSchema);
