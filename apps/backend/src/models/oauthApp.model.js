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
    signingSecretCipher: {
      type: String,
      default: null,
    },
    signingSecretIv: {
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
      min: 1,
    },
    rateLimitPerDay: {
      type: Number,
      default: 5000,
      min: 1,
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

oauthAppSchema.index({ developerId: 1, status: 1, createdAt: -1 });

module.exports =
  mongoose.models.OAuthApp ||
  mongoose.model("OAuthApp", oauthAppSchema);
