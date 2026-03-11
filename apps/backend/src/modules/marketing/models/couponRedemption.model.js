const mongoose = require("mongoose");

const couponRedemptionSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketingCoupon",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    discountValue: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

couponRedemptionSchema.index({ orderId: 1, couponId: 1 }, { unique: true });

module.exports =
  mongoose.models.CouponRedemption ||
  mongoose.model("CouponRedemption", couponRedemptionSchema);
