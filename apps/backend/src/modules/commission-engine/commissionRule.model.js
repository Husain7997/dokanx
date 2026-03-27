const mongoose = require("mongoose");

const commissionRuleSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["CATEGORY", "MERCHANT_TIER", "CAMPAIGN"],
      required: true,
      index: true,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      default: null,
      index: true,
    },
    merchantTier: {
      type: String,
      default: null,
      index: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      default: null,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.CommissionRule ||
  mongoose.model("CommissionRule", commissionRuleSchema);
