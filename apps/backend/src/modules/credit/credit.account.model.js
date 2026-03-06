const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      index: true,
      required: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerIdentity",
      index: true,
      required: true,
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

    dueSince: Date,

    lastCreditAt: Date,

    lastPaymentAt: Date,

    totalCreditIssued: {
      type: Number,
      default: 0,
    },

    totalPaymentsReceived: {
      type: Number,
      default: 0,
    },

    overdueDays: {
      type: Number,
      default: 0,
    },

    riskScore: {
      type: Number,
      default: 0,
    },

    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "LOW",
    },
  },
  { timestamps: true }
);

schema.index(
  { shop: 1, customer: 1 },
  { unique: true }
);

module.exports = mongoose.models.CreditAccount || mongoose.model(
  "CreditAccount",
  schema
);
