const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema(
  {
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },

    type: {
      type: String,
      enum: ["CREDIT", "DEBIT"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    source: {
      type: String,
      enum: ["ORDER_PAYMENT", "SMS_PACKAGE", "SUBSCRIPTION",
        "PAYMENT", "REFUND", "ADJUSTMENT"],
      required: true,
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    status: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
      default: "SUCCESS",
    },
  },
  { timestamps: true }
);
walletTransactionSchema.index(
  { referenceId: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "WalletTransaction",
  walletTransactionSchema
);
