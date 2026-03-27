const mongoose = require("mongoose");

const IdempotencySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    scope: { type: String, default: "global", index: true },
    route: { type: String, default: "worker" },
    requestHash: { type: String, default: null },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED"],
      default: "PENDING",
      index: true,
    },
    response: { type: Object, default: null },
    statusCode: { type: Number, default: null },
    error: { type: String, default: null },
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", default: null },
    expiresAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

IdempotencySchema.index({ key: 1, scope: 1 });

// ✅ SAFE MODEL REGISTRATION
module.exports =
  mongoose.models.Idempotency ||
  mongoose.model("Idempotency", IdempotencySchema);
