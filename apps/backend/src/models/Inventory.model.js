const mongoose = require("mongoose");

const InventorySchema = new mongoose.Schema(
{
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
    index: true
  },

  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    unique: true
  },

  stock: {
    type: Number,
    default: 0
  },

  reserved: {
    type: Number,
    default: 0
  },

  inventoryVersion: {
    type: Number,
    default: 0
  },

  isActive: {
    type: Boolean,
    default: true
  },

  isReconciling: {
    type: Boolean,
    default: false
  }
},
{ timestamps: true }
);



module.exports =
  mongoose.models.Inventory ||
  mongoose.model("Inventory", InventorySchema);