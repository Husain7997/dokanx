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
    },
    rateLimitPerDay: {
      type: Number,
      default: 5000,
    },
    usageLimit: {
      type: Number,
      default: null,
    },
    usageRemaining: {
      type: Number,
      default: null,
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



module.exports =
  mongoose.models.ApiKey ||
  mongoose.model("ApiKey", schema);
