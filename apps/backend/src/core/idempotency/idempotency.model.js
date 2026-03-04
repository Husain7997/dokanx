const mongoose = require("mongoose");

const IdempotencySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    scope: { type: String },
    status: { type: String, default: "PENDING" },
    response: { type: Object },
  },
  { timestamps: true }
);

// ✅ SAFE MODEL REGISTRATION
module.exports =
  mongoose.models.Idempotency ||
  mongoose.model("Idempotency", IdempotencySchema);