const mongoose = require("mongoose");

const courierOptimizationProfileSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    weights: {
      reliability: { type: Number, default: 0.4 },
      cost: { type: Number, default: 0.25 },
      speed: { type: Number, default: 0.25 },
      codSuccess: { type: Number, default: 0.1 },
    },
    preferredProviders: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

courierOptimizationProfileSchema.index({ shopId: 1 }, { unique: true });

module.exports =
  mongoose.models.CourierOptimizationProfile ||
  mongoose.model("CourierOptimizationProfile", courierOptimizationProfileSchema);
