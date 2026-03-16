const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, default: "PROMO" },
    status: { type: String, enum: ["DRAFT", "ACTIVE", "PAUSED"], default: "DRAFT" },
    audience: { type: Object, default: null },
    scheduleAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Campaign || mongoose.model("Campaign", campaignSchema);
