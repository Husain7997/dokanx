const mongoose = require("mongoose");
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const schema = new mongoose.Schema(
  {
    shop: {
      type: ObjectId,
      ref: "Shop",
      default: null,
    },
    shopId: {
      type: ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    customer: {
      type: ObjectId,
      ref: "CustomerIdentity",
      default: null,
    },
    customerId: {
      type: String,
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
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["PENDING", "POSTED", "VOID"],
      default: "POSTED",
    },

    reference: {
      type: String,
      default: null,
    },

    meta: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "CreditLedger",
  schema
);
