const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      index: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerIdentity",
      index: true,
    },
    customerId: {
      type: String,
      index: true,
    },

    outstandingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
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

schema.index({ shopId: 1, customerId: 1 }, { unique: true });
