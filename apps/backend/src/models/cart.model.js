const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    guestToken: {
      type: String,
      default: null,
      index: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    totals: {
      itemCount: { type: Number, default: 0 },
      quantity: { type: Number, default: 0 },
      subtotal: { type: Number, default: 0 },
      discountTotal: { type: Number, default: 0 },
      grandTotal: { type: Number, default: 0 },
    },
    appliedCoupon: {
      code: { type: String, default: "" },
      type: { type: String, default: "" },
      discountValue: { type: Number, default: 0 },
      appliedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

cartSchema.index(
  { shopId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: "objectId" } } }
);

cartSchema.index(
  { shopId: 1, guestToken: 1 },
  { unique: true, partialFilterExpression: { guestToken: { $type: "string" } } }
);

module.exports =
  mongoose.models.Cart ||
  mongoose.model("Cart", cartSchema);
