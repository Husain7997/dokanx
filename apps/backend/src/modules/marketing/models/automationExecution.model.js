const mongoose = require("mongoose");

const automationExecutionSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    ruleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketingAutomationRule",
      required: true,
      index: true,
    },
    trigger: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["QUEUED", "SKIPPED", "EXECUTED", "FAILED"],
      default: "QUEUED",
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

automationExecutionSchema.index({ shopId: 1, trigger: 1, createdAt: -1 });

module.exports =
  mongoose.models.MarketingAutomationExecution ||
  mongoose.model("MarketingAutomationExecution", automationExecutionSchema);
