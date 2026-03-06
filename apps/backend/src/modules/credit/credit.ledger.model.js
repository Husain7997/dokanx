const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerIdentity",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "CREDIT_ISSUED",
        "PAYMENT_RECEIVED",
        "ADJUSTMENT",
      ],
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    reference: {
      type: String,
      default: "",
      index: true,
    },

    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },

    meta: Object,
  },
  { timestamps: true }
);

schema.pre("deleteOne", () => {
  throw new Error("Credit ledger delete forbidden");
});

module.exports = mongoose.models.CreditLedger || mongoose.model(
  "CreditLedger",
  schema
);
