const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    companyName: {
      type: String,
      default: "",
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    categories: {
      type: [String],
      default: [],
      index: true,
    },
    brands: {
      type: [String],
      default: [],
    },
    coverageAreas: {
      type: [String],
      default: [],
      index: true,
    },
    minimumOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [90.4125, 23.8103],
      },
      address: {
        type: String,
        default: "",
      },
    },
    ratingAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdByShop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

supplierSchema.index({ location: "2dsphere" });
supplierSchema.index({ categories: 1, ratingAverage: -1 });
supplierSchema.index({ name: "text", companyName: "text", categories: "text", brands: "text" });

module.exports =
  mongoose.models.Supplier ||
  mongoose.model("Supplier", supplierSchema);
