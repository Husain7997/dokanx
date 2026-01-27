const mongoose = require("mongoose");
const LEDGER_SOURCES = [
  'ORDER',
  'SETTLEMENT',
  'PAYOUT',
  'REFUND',
  'ADJUSTMENT',
  'SYSTEM',   
  'TAX', 
   "WALLET_TOPUP"
];
const LedgerSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

type: {
  type: String,
  enum: ["CREDIT", "DEBIT", "SETTLEMENT_CREDIT", "REFUND_DEBIT"],
  required: true,
},

    amount: {
      type: Number,
      required: true,
    },

    source: {
      type: String,
      enum: LEDGER_SOURCES,
      required: true,
    },

  referenceType: {
  type: String,
  enum: ["ORDER", "SETTLEMENT", "REFUND"],
  required: true,
},
 referenceId: { 
  type: String, 
  index: true },


    balanceAfter: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

// 🔒 Idempotency guard
LedgerSchema.index({ referenceId: 1, source: 1 }, { unique: true });

// module.exports = mongoose.model("Ledger", LedgerSchema);

module.exports =
  mongoose.models.Ledger ||
  mongoose.model("Ledger", LedgerSchema);
