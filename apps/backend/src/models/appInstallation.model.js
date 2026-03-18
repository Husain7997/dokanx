const mongoose = require("mongoose");

const appInstallationSchema = new mongoose.Schema(
  {
    appId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OAuthApp",
      required: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    installedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["INSTALLED", "UNINSTALLED"],
      default: "INSTALLED",
    },
    scopes: {
      type: [String],
      default: [],
    },
    sandboxMode: {
      type: Boolean,
      default: false,
    },
    installedAt: {
      type: Date,
      default: null,
    },
    uninstalledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

appInstallationSchema.index({ appId: 1, shopId: 1 }, { unique: true });

module.exports =
  mongoose.models.AppInstallation ||
  mongoose.model("AppInstallation", appInstallationSchema);
