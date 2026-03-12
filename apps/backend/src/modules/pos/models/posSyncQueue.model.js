const mongoose = require("mongoose");

const posSyncQueueSchema = new mongoose.Schema(
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
    clientMutationId: {
      type: String,
      required: true,
      trim: true,
    },
    payload: {
      type: Object,
      required: true,
      default: {},
    },
    paymentTypes: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "SYNCED", "FAILED"],
      default: "PENDING",
      index: true,
    },
    attemptCount: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
      default: "",
    },
    syncedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

posSyncQueueSchema.index({ shopId: 1, terminalId: 1, clientMutationId: 1 }, { unique: true });
posSyncQueueSchema.index({ shopId: 1, status: 1, createdAt: 1 });

module.exports =
  mongoose.models.PosSyncQueue ||
  mongoose.model("PosSyncQueue", posSyncQueueSchema);
