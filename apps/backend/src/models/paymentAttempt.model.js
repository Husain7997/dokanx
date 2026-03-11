const mongoose = require("mongoose");

const paymentAttemptSchema = new mongoose.Schema(
  {
    shopId: {
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
      default: false,
      index: true,
    },

    billingSnapshot: {
      orderChannel: { type: String, default: "ONLINE" },
      paymentMethod: { type: String, default: "UNKNOWN" },
      routing: {
        destination: { type: String, default: "" },
        gatewayKey: { type: String, default: "" },
        source: { type: String, default: "" },
      },
      commission: {
        rate: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
        source: { type: String, default: "" },
      },
    },

    processedAt: Date,
    webhookEventId: {
  type: String,
  index: true,
},
  },
  { timestamps: true }
);




module.exports = mongoose.models.PaymentAttempt || mongoose.model("PaymentAttempt", paymentAttemptSchema);
