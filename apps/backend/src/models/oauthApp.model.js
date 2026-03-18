const mongoose = require("mongoose");

const oauthAppSchema = new mongoose.Schema(
  {
    developerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Developer",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
    redirectUris: {
      type: [String],
      default: [],
    },
    scopes: {
      type: [String],
      default: [],
    },
    webhookSecretHash: {
      type: String,
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
    clientId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    clientSecretHash: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "DRAFT"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.OAuthApp ||
  mongoose.model("OAuthApp", oauthAppSchema);
