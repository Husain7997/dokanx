const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    canonicalName: {
      type: String,
      required: true,
      index: true,
    },

    normalizedName: {
      type: String,
      required: true,
      index: true,
    },

    slug: {
      type: String,
      unique: true,
      sparse: true,
    },

    aliases: {
      type: [String],
      default: [],
    },

    brand: {
      type: String,
      default: "",
      index: true,
    },

    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      default: null,
      index: true,
    },

    category: {
      type: String,
      default: "",
      index: true,
    },

    barcode: {
      type: String,
      default: "",
      sparse: true,
      index: true,
    },

    images: {
      type: [String],
      default: [],
    },

    description: {
      type: String,
      default: "",
    },

    attributes: {
      type: Object,
      default: {},
    },

    popularityScore: {
      type: Number,
      default: 0,
      index: true,
    },

    imageUrl: {
      type: String,
      default: "",
    },

    source: {
      type: String,
      enum: ["SYSTEM", "SHOP_ACCEPTED", "SHOP_EDITED", "SHOP_SUBMITTED"],
      default: "SYSTEM",
      index: true,
    },

    confidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdByShop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
    },
  },
  { timestamps: true }
);

schema.index({ normalizedName: 1, brand: 1, category: 1 });

schema.index({
  canonicalName: "text",
  aliases: "text",
  brand: "text",
  category: "text",
});

module.exports =
  mongoose.models.CatalogGlobalProduct ||
  mongoose.model("CatalogGlobalProduct", schema);