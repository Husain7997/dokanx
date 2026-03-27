const mongoose = require("mongoose");

const accountingEntrySchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    customerId: {
      type: String,
      default: null,
      index: true,
    },
    walletType: {
      type: String,
      enum: ["CASH", "CREDIT", "BANK"],
      default: "CASH",
      index: true,
    },
    transactionType: {
      type: String,
      enum: ["income", "expense", "transfer", "cheque"],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    direction: {
      type: String,
      enum: ["debit", "credit"],
      required: true,
    },
    referenceId: {
      type: String,
      required: true,
      index: true,
    },
    debitAccount: {
      type: String,
      required: true,
    },
    creditAccount: {
      type: String,
      required: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

accountingEntrySchema.index(
  { shopId: 1, referenceId: 1, transactionType: 1, walletType: 1, direction: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.AccountingEntry ||
  mongoose.model("AccountingEntry", accountingEntrySchema);
