const mongoose = require("mongoose");

const appListingSchema = new mongoose.Schema(
  {
    appId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OAuthApp",
      required: true,
      unique: true,
      index: true,
    },
    developerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Developer",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    tagline: String,
    description: String,
    categories: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "SUSPENDED"],
      default: "DRAFT",
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.AppListing ||
  mongoose.model("AppListing", appListingSchema);
