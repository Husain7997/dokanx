const mongoose = require("mongoose");

const schema = new mongoose.Schema({

  barcode: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  globalProductId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CatalogGlobalProduct",
    required: true
  },

  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProductVariant",
    default: null
  }

}, { timestamps: true });

module.exports =
mongoose.models.BarcodeRegistry ||
mongoose.model("BarcodeRegistry", schema);