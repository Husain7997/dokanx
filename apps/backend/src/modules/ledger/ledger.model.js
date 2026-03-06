const mongoose = require("mongoose");

const ledgerSchema = new mongoose.Schema({

  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },

  amount: {
    type: Number,
    required: true
  },

  type: {
    type: String,
    enum: ["debit", "credit"], // ✅ strict double entry
    required: true
  },

  referenceId: {
    type: String,
    required: true,
    index: true
  },

  meta: {
    type: Object,
    default: {}
  }

}, { timestamps: true });

ledgerSchema.pre("updateOne", () => {
  throw new Error("Ledger immutable");
});

ledgerSchema.pre("deleteOne", () => {
  throw new Error("Ledger delete forbidden");
});

module.exports = mongoose.model("Ledger", ledgerSchema);