const mongoose = require("mongoose");

const paymentRoutingRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      default: null,
      index: true,
    },
    priority: {
      type: Number,
      default: 100,
      min: 0,
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    condition: {
      orderChannel: {
        type: String,
        enum: ["ONLINE", "POS", "ALL"],
        default: "ONLINE",
      },
      paymentMethod: {
        type: String,
        default: "ALL",
        trim: true,
        uppercase: true,
      },
      hasOwnGateway: {
        type: Boolean,
        default: null,
      },
    },
    destination: {
      type: String,
      enum: ["MERCHANT_DIRECT", "PLATFORM_WALLET"],
      required: true,
    },
    gatewayKey: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

paymentRoutingRuleSchema.index({ shopId: 1, planId: 1, enabled: 1, priority: 1 });

module.exports =
  mongoose.models.PaymentRoutingRule || mongoose.model("PaymentRoutingRule", paymentRoutingRuleSchema);
