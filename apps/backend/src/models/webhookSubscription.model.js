const mongoose = require("mongoose");

const webhookSchema = new mongoose.Schema(
  {
    developerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Developer",
      required: true,
      index: true,
    },
    appId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OAuthApp",
      default: null,
    },
    url: {
      type: String,
      required: true,
    },
    events: {
      type: [String],
      default: [],
    },
    secretCipher: String,
    secretIv: String,
    status: {
      type: String,
      enum: ["ACTIVE", "DISABLED"],
      default: "ACTIVE",
    },
    lastFailureAt: Date,
    failureCount: {
      type: Number,
      default: 0,
    },
    lastDeliveredAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.WebhookSubscription ||
  mongoose.model("WebhookSubscription", webhookSchema);
