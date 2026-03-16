const mongoose = require("mongoose");

const shopLocationSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    name: { type: String, required: true },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    country: { type: String, default: "" },
    coordinates: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

shopLocationSchema.index({ coordinates: "2dsphere" });

module.exports =
  mongoose.models.ShopLocation ||
  mongoose.model("ShopLocation", shopLocationSchema);
