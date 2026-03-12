const mongoose = require("mongoose");

const appWebhookDeliverySchema = new mongoose.Schema(
  {
    webhookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AppWebhook",
      required: true,
      index: true,
    },
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
      uppercase: true,
      index: true,
    },
    targetUrl: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["QUEUED", "DELIVERED", "FAILED"],
      default: "QUEUED",
      index: true,
    },
    responseStatus: {
      type: Number,
      default: 0,
    },
    requestBody: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    responseBody: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    errorMessage: {
      type: String,
      default: "",
    },
    attemptCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    nextRetryAt: {
      type: Date,
      default: null,
      index: true,
    },
    deadLetteredAt: {
      type: Date,
      default: null,
      index: true,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

appWebhookDeliverySchema.index({ shopId: 1, eventName: 1, createdAt: -1 });

module.exports =
  mongoose.models.AppWebhookDelivery ||
  mongoose.model("AppWebhookDelivery", appWebhookDeliverySchema);
