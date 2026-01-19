const mongoose = require("mongoose");

const paymentAttemptSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true
    },

    gateway: {
      type: String,
      required: true
    },

    providerPaymentId: {
      type: String,
      required: true,
      index: true,
      unique: true
    },

    amount: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "PENDING"
    },

    processed: {
      type: Boolean,
      default: false
    },

    processedAt: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentAttempt", paymentAttemptSchema);
