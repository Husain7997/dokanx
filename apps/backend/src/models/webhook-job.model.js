const mongoose = require("mongoose");

const webhookJobSchema = new mongoose.Schema(
  {
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WebhookSubscription",
      required: true,
      index: true,
    },
    appId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OAuthApp",
      default: null,
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
      index: true,
    },
    event: {
      type: String,
      required: true,
      index: true,
    },
    payload: {
      type: Object,
      default: {},
    },
    targetUrl: {
      type: String,
      required: true,
    },
    deliveryId: {
      type: String,
      required: true,
      index: true,
    },
    dedupeKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "dead_letter"],
      default: "pending",
      index: true,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 5,
    },
    nextRetryAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      default: null,
    },
    lastStatusCode: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

webhookJobSchema.index({ subscriptionId: 1, event: 1, createdAt: -1 });

module.exports =
  mongoose.models.WebhookJob ||
  mongoose.model("WebhookJob", webhookJobSchema);
