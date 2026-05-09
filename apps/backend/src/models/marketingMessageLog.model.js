const mongoose = require("mongoose");

const marketingMessageLogSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", default: null, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    to: { type: String, required: true, index: true },
    channel: { type: String, enum: ["sms", "whatsapp"], default: "sms", index: true },
    ruleKey: { type: String, required: true, index: true },
    event: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ["SENT", "SKIPPED", "FAILED"], default: "SENT", index: true },
    provider: { type: String, default: "" },
    providerId: { type: String, default: "" },
    reason: { type: String, default: "" },
  },
  { timestamps: true }
);

marketingMessageLogSchema.index({ to: 1, createdAt: -1 });
marketingMessageLogSchema.index({ to: 1, ruleKey: 1, createdAt: -1 });

module.exports = mongoose.models.MarketingMessageLog || mongoose.model("MarketingMessageLog", marketingMessageLogSchema);
