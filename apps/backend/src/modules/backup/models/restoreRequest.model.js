const mongoose = require("mongoose");

const restoreRequestSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      enum: ["SYSTEM", "SHOP"],
      default: "SYSTEM",
      index: true,
    },
    scopeRef: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    targetTimestamp: {
      type: Date,
      required: true,
      index: true,
    },
    transactionLogReplay: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["REQUESTED", "APPROVED", "RUNNING", "COMPLETED", "FAILED", "REJECTED"],
      default: "REQUESTED",
      index: true,
    },
    reason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

restoreRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("RestoreRequest", restoreRequestSchema);
