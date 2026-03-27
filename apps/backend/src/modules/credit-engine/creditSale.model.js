const mongoose = require("mongoose");

const creditSaleSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    outstandingAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["OPEN", "PARTIAL", "PAID"],
      default: "OPEN",
      index: true,
    },
    payments: {
      type: [
        {
          amount: Number,
          referenceId: String,
          providerPaymentId: String,
          paidAt: Date,
          confirmedAt: Date,
          status: {
            type: String,
            enum: ["PENDING", "CONFIRMED", "FAILED"],
            default: "CONFIRMED",
          },
          metadata: Object,
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.CreditSale ||
  mongoose.model("CreditSale", creditSaleSchema);
