const mongoose = require("mongoose");

const LedgerSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true
    },

    type: {
      type: String,
      enum: ["CREDIT", "DEBIT"],
      required: true
    },

    amount: {
      type: Number,
      required: true
    },

    source: {
      type: String,
      enum: ["ORDER_PAYMENT", "REFUND", "COMMISSION", "PAYOUT"],
      required: true
    },

    referenceType: {
      type: String,
      enum: ["ORDER", "PAYMENT", "SETTLEMENT"],
      required: true
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },

    balanceAfter: {
      type: Number,
      required: true
    }
  },
  { timestamps: true }
);

// 🔒 Idempotency guard
LedgerSchema.index(
  { referenceId: 1, source: 1 },
  { unique: true }
);

module.exports = mongoose.model("Ledger", LedgerSchema);
