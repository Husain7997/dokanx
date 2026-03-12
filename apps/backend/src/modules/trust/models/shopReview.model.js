const mongoose = require("mongoose");

const shopReviewSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    reviewText: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

shopReviewSchema.index({ shopId: 1, createdAt: -1 });
shopReviewSchema.index({ shopId: 1, orderId: 1, customerId: 1 }, { unique: true });

module.exports =
  mongoose.models.ShopReview ||
  mongoose.model("ShopReview", shopReviewSchema);
