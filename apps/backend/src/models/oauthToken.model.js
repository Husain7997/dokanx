const mongoose = require("mongoose");

const oauthTokenSchema = new mongoose.Schema(
  {
    accessToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    refreshToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    appId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OAuthApp",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    scopes: {
      type: [String],
      default: [],
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

oauthTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports =
  mongoose.models.OAuthToken ||
  mongoose.model("OAuthToken", oauthTokenSchema);
