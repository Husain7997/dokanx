const mongoose = require("mongoose");

const appInstallationSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    appId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketplaceApp",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "UNINSTALLED"],
      default: "ACTIVE",
      index: true,
    },
    grantedPermissions: {
      type: [String],
      default: [],
    },
    installedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    installedAt: {
      type: Date,
      default: Date.now,
    },
    uninstalledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

appInstallationSchema.index({ shopId: 1, appId: 1 }, { unique: true });

module.exports =
  mongoose.models.AppInstallation ||
  mongoose.model("AppInstallation", appInstallationSchema);
