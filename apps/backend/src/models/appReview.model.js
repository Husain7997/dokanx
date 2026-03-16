const mongoose = require("mongoose");

const appReviewSchema = new mongoose.Schema(
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: String,
  },
  { timestamps: true }
);

appReviewSchema.index({ appId: 1, shopId: 1, userId: 1 }, { unique: true });

module.exports =
  mongoose.models.AppReview ||
  mongoose.model("AppReview", appReviewSchema);
