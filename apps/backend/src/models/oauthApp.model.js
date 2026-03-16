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
      enum: ["ACTIVE", "SUSPENDED"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.OAuthApp ||
  mongoose.model("OAuthApp", oauthAppSchema);
