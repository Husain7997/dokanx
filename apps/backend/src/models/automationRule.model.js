const mongoose = require("mongoose");

const automationRuleSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", default: null, index: true },
    name: { type: String, required: true },
    event: {
      type: String,
      enum: ["CART_ABANDONED", "ORDER_DELIVERED", "CUSTOMER_AT_RISK", "CUSTOMER_VIP"],
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ["SEND_SMS", "SEND_WHATSAPP"],
      default: "SEND_SMS",
    },
    templateKey: {
      type: String,
      enum: ["abandoned", "thankYou", "winback", "vip"],
      required: true,
    },
    enabled: { type: Boolean, default: true, index: true },
    segment: { type: String, default: "" },
    delayMinutes: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

automationRuleSchema.index({ shopId: 1, event: 1, enabled: 1 });

module.exports = mongoose.models.AutomationRule || mongoose.model("AutomationRule", automationRuleSchema);
