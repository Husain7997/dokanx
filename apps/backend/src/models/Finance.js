const mongoose = require("mongoose");

const financeSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    period: { type: String, required: true }, // e.g. "2026-01"
    grossAmount: { type: Number, default: 0 },
    platformFee: { type: Number, default: 0 },
    netPayout: { type: Number, default: 0 },
    payoutStatus: { type: String, enum: ["PENDING", "SUCCESS", "FAILED"], default: "PENDING" },
    settledAt: Date
  },
  { timestamps: true }
);

// module.exports = mongoose.model("Finance", financeSchema);

module.exports =
  mongoose.models.Finance ||
  mongoose.model("Finance", financeSchema);