const mongoose = require("mongoose");

const schema = new mongoose.Schema({

  globalProductId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CatalogGlobalProduct",
    required: true,
    index: true
  },

  sku: {
    type: String,
    index: true
  },

  attributes: {
    type: Object,
    default: {}
  },

  barcode: {
    type: String,
    index: true
  },

  weight: String,

  dimensions: {
    length: Number,
    width: Number,
    height: Number
  },

  images: [String]

}, { timestamps: true });

module.exports =
mongoose.models.ProductVariant ||
mongoose.model("ProductVariant", schema);