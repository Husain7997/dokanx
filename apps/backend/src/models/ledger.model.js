const mongoose = require("mongoose");

const ledgerSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    type: {
      type: String,
      enum: ["CREDIT", "DEBIT"],
      required: true,
    },

    source: {
      type: String,
      enum: ["PAYMENT", "REFUND", "ADJUSTMENT"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    balanceAfter: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ledger", ledgerSchema);
