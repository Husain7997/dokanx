const mongoose = require("mongoose");

const buyXGetYSchema = new mongoose.Schema(
  {
    buyQuantity: { type: Number, min: 1, default: 1 },
    getQuantity: { type: Number, min: 1, default: 1 },
    targetProductId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
  },
  { _id: false }
);

const couponSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    title: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120,
    },
    type: {
      type: String,
      enum: ["PERCENTAGE", "FIXED", "FREE_SHIPPING", "BUY_X_GET_Y"],
      required: true,
    },
    value: {
      type: Number,
      default: 0,
      min: 0,
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    usageLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    buyXGetY: {
      type: buyXGetYSchema,
      default: () => ({}),
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

couponSchema.index({ shopId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model("MarketingCoupon", couponSchema);
