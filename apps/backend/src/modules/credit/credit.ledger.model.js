const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    shop: ObjectId,
    customer: ObjectId,

    type: {
      type: String,
      enum: [
        "CREDIT_ISSUED",
        "PAYMENT_RECEIVED",
        "ADJUSTMENT",
      ],
    },

    amount: Number,

    reference: String,

    meta: Object,
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "CreditLedger",
  schema
);