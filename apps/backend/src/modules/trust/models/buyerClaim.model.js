const mongoose = require("mongoose");

const buyerClaimSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    issueType: {
      type: String,
      enum: ["NOT_DELIVERED", "WRONG_PRODUCT", "DAMAGED_PRODUCT", "OTHER"],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["OPEN", "UNDER_REVIEW", "RESOLVED", "REJECTED"],
      default: "OPEN",
    },
  },
  { timestamps: true }
);

buyerClaimSchema.index({ shopId: 1, status: 1, createdAt: -1 });

module.exports =
  mongoose.models.BuyerClaim ||
  mongoose.model("BuyerClaim", buyerClaimSchema);
