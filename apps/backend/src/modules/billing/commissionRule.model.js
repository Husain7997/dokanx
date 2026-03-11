const mongoose = require("mongoose");

const commissionRuleSchema = new mongoose.Schema(
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
    orderChannel: {
      type: String,
      enum: ["ONLINE", "POS", "ALL"],
      default: "ONLINE",
      index: true,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    priority: {
      type: Number,
      default: 100,
      min: 0,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

commissionRuleSchema.index({ shopId: 1, planId: 1, orderChannel: 1, enabled: 1, priority: 1 });

module.exports = mongoose.models.CommissionRule || mongoose.model("CommissionRule", commissionRuleSchema);
