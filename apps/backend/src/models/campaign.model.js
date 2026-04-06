const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, default: "PROMO" },
    status: { type: String, enum: ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"], default: "DRAFT" },
    platform: { type: String, default: "FACEBOOK" },
    channel: { type: String, default: "SOCIAL" },
    audience: { type: Object, default: null },
    scheduleAt: { type: Date, default: null },
    content: { type: String, default: "" },
    offerTitle: { type: String, default: "" },
    ctaLabel: { type: String, default: "Shop now" },
    redirectUrl: { type: String, default: "" },
    trackingCode: { type: String, default: "" },
    targetingSummary: { type: String, default: "" },
    autoMessage: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Campaign || mongoose.model("Campaign", campaignSchema);
