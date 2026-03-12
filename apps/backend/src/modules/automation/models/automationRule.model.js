const mongoose = require("mongoose");

const automationRuleSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    trigger: {
      type: String,
      required: true,
      uppercase: true,
      index: true,
    },
    conditions: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    actions: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

automationRuleSchema.index({ shopId: 1, trigger: 1, enabled: 1 });

module.exports =
  mongoose.models.AutomationRule ||
  mongoose.model("AutomationRule", automationRuleSchema);
