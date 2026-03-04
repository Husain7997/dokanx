const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      index: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerIdentity",
      index: true,
    },

    outstandingBalance: {
      type: Number,
      default: 0,
    },

    creditLimit: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "BLOCKED"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "CreditAccount",
  schema
);