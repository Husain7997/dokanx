const mongoose = require("mongoose");

const oauthAuthCodeSchema = new mongoose.Schema(
  {
    code: {
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
    redirectUri: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

oauthAuthCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports =
  mongoose.models.OAuthAuthCode ||
  mongoose.model("OAuthAuthCode", oauthAuthCodeSchema);
