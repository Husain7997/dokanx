const mongoose = require("mongoose");

const appWebhookSchema = new mongoose.Schema(
  {
    appId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketplaceApp",
      required: true,
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    eventName: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    targetUrl: {
      type: String,
      required: true,
      trim: true,
    },
    secretHash: {
      type: String,
      required: true,
      select: false,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "DISABLED"],
      default: "ACTIVE",
      index: true,
    },
    installedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

appWebhookSchema.index({ appId: 1, shopId: 1, eventName: 1, targetUrl: 1 }, { unique: true });

module.exports =
  mongoose.models.AppWebhook ||
  mongoose.model("AppWebhook", appWebhookSchema);
