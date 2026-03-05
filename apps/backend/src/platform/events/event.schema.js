const mongoose = require("mongoose");

const PlatformEventSchema = new mongoose.Schema(
  {
    eventName: { type: String, required: true, index: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, index: true },
    aggregateId: { type: String, index: true },
    idempotencyKey: { type: String, required: true, unique: true },
    payload: { type: Object, default: {} },
    version: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ["PENDING", "DISPATCHED", "FAILED"],
      default: "PENDING",
      index: true
    },
    occurredAt: { type: Date, default: Date.now, index: true },
    lastError: { type: String, default: null }
  },
  { timestamps: true }
);

PlatformEventSchema.index({ tenantId: 1, occurredAt: -1 });

module.exports =
  mongoose.models.PlatformEvent ||
  mongoose.model("PlatformEvent", PlatformEventSchema);
