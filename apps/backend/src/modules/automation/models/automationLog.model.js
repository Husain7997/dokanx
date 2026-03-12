const mongoose = require("mongoose");

const automationLogSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    ruleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AutomationRule",
      required: true,
      index: true,
    },
    trigger: {
      type: String,
      required: true,
      uppercase: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["EXECUTED", "SKIPPED", "FAILED"],
      default: "EXECUTED",
      index: true,
    },
    context: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

automationLogSchema.index({ shopId: 1, trigger: 1, createdAt: -1 });

module.exports =
  mongoose.models.AutomationLog ||
  mongoose.model("AutomationLog", automationLogSchema);
