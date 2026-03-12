const mongoose = require("mongoose");

const posPaymentSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    posSaleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PosSale",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    method: {
      type: String,
      enum: ["CASH", "BKASH", "CARD"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    providerPaymentId: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["SUCCESS"],
      default: "SUCCESS",
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.PosPayment ||
  mongoose.model("PosPayment", posPaymentSchema);
