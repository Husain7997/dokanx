const mongoose = require("mongoose");

const appTokenSchema = new mongoose.Schema(
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
    installationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AppInstallation",
      required: true,
      index: true,
    },
    tokenType: {
      type: String,
      enum: ["AUTH_CODE", "ACCESS"],
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      index: true,
      select: false,
    },
    refreshTokenHash: {
      type: String,
      default: "",
      select: false,
    },
    scopes: {
      type: [String],
      default: [],
    },
    redirectUri: {
      type: String,
      default: "",
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

appTokenSchema.index({ appId: 1, shopId: 1, tokenType: 1, revokedAt: 1 });

module.exports =
  mongoose.models.AppToken ||
  mongoose.model("AppToken", appTokenSchema);
