const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
{
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
    index: true,
  },

  name: {
    type: String,
    required: true,
  },

  price: {
    type: Number,
    required: true,
  },

  stock: {
    type: Number,
    default: 0,
    min: 0,
  },

  reserved: {
    type: Number,
    default: 0,
    min: 0,
  },
inventoryVersion: {
  type: Number,
  default: 0,
},
  isActive: {
    type: Boolean,
    default: true,
  },
  reconciledAt: Date,
isReconciling: {
  type: Boolean,
  default: false,
},
},
{ timestamps: true }
);

productSchema.index({ shopId: 1, name: 1 });
productSchema.index({ shopId: 1, createdAt: -1 });

module.exports =
  mongoose.models.Product ||
  mongoose.model("Product", productSchema);