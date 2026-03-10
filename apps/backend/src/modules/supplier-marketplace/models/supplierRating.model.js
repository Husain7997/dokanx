const mongoose = require("mongoose");

const supplierRatingSchema = new mongoose.Schema(
  {
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: "",
      trim: true,
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

supplierRatingSchema.index({ supplierId: 1, shopId: 1 }, { unique: true });

module.exports =
  mongoose.models.SupplierRating ||
  mongoose.model("SupplierRating", supplierRatingSchema);
