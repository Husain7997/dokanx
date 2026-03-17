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
  slug: {
    type: String,
    default: null,
    index: true,
  },
  barcode: {
    type: String,
    default: null,
    index: true,
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
  moderationStatus: {
    type: String,
    enum: ["PENDING", "APPROVED", "REJECTED", "FLAGGED"],
    default: "PENDING",
    index: true,
  },
  moderationNote: {
    type: String,
    default: "",
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
productSchema.index({ shopId: 1, slug: 1 });
productSchema.index({ shopId: 1, barcode: 1 });

module.exports =
  mongoose.models.Product ||
  mongoose.model("Product", productSchema);
