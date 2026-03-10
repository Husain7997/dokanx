const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    action: {
      type: String,
      enum: ["ACCEPT", "EDIT", "IGNORE"],
      required: true,
      index: true,
    },

    globalProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CatalogGlobalProduct",
      default: null,
      index: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
      index: true,
    },

    query: {
      name: { type: String, default: "" },
      barcode: { type: String, default: "" },
    },

    selectedSnapshot: {
      name: { type: String, default: "" },
      brand: { type: String, default: "" },
      category: { type: String, default: "" },
      barcode: { type: String, default: "" },
      imageUrl: { type: String, default: "" },
      price: { type: Number, default: null },
    },

    localSnapshot: {
      name: { type: String, default: "" },
      brand: { type: String, default: "" },
      category: { type: String, default: "" },
      barcode: { type: String, default: "" },
      imageUrl: { type: String, default: "" },
      price: { type: Number, default: null },
    },

    allowCreateGlobal: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

schema.index({ shopId: 1, action: 1, createdAt: -1 });

module.exports =
  mongoose.models.CatalogDecision ||
  mongoose.model("CatalogDecision", schema);
