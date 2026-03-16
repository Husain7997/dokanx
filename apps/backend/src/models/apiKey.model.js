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
