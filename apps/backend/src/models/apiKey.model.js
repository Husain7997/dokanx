const mongoose = require("mongoose");

const schema = new mongoose.Schema(
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
    legacy: {
      type: Boolean,
      default: false,
      index: true,
    },
    migrationStatus: {
      type: String,
      enum: ["none", "legacy", "migrated"],
      default: "none",
    },
    migratedAt: {
      type: Date,
      default: null,
    },
    name: {
      type: String,
      default: "Default key",
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    prefix: {
      type: String,
      default: "dkx",
    },
    keyPreview: {
      type: String,
      default: "",
      maxlength: 64,
    },
    signingSecretCipher: {
      type: String,
      default: null,
    },
    signingSecretIv: {
      type: String,
      default: null,
    },
    permissions: {
      type: [String],
      default: [],
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
    },
    sandboxMode: {
      type: Boolean,
      default: false,
    },
    ipWhitelist: {
      type: [String],
      default: [],
    },
    rateLimitPerMinute: {
      type: Number,
      default: 60,
      min: 1,
    },
    rateLimitPerDay: {
      type: Number,
      default: 5000,
      min: 1,
    },
    usageLimit: {
      type: Number,
      default: null,
      min: 0,
    },
    usageRemaining: {
      type: Number,
      default: null,
      min: 0,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    lastUsedIp: {
      type: String,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

schema.index({ appId: 1, shopId: 1, legacy: 1 });



module.exports =
  mongoose.models.ApiKey ||
  mongoose.model("ApiKey", schema);
