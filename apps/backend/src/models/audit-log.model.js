const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ["api_access", "admin_action", "app_install", "financial_action", "webhook", "security"],
      default: "api_access",
      index: true,
    },
    actorType: {
      type: String,
      default: "system",
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
      index: true,
    },
    appId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OAuthApp",
      default: null,
      index: true,
    },
    apiKeyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ApiKey",
      default: null,
      index: true,
    },
    method: {
      type: String,
      default: null,
    },
    path: {
      type: String,
      default: null,
    },
    statusCode: {
      type: Number,
      default: null,
    },
    durationMs: {
      type: Number,
      default: null,
    },
    ip: {
      type: String,
      default: null,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.PlatformAuditLog ||
  mongoose.model("PlatformAuditLog", auditLogSchema);
