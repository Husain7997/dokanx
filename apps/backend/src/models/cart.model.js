const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, default: "" },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    imageUrl: { type: String, default: "" },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    guestToken: { type: String, default: null, index: true },
    items: { type: [cartItemSchema], default: [] },
    totals: {
      subtotal: { type: Number, default: 0 },
      quantity: { type: Number, default: 0 },
      itemCount: { type: Number, default: 0 },
      grandTotal: { type: Number, default: 0 },
    },
    couponCode: { type: String, default: null },
  },
  { timestamps: true }
);

cartSchema.index({ shopId: 1, userId: 1 }, { unique: false });
cartSchema.index({ shopId: 1, guestToken: 1 }, { unique: false });

module.exports = mongoose.models.Cart || mongoose.model("Cart", cartSchema);
