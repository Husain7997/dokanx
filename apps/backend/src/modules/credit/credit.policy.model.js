const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
    unique: true,
    index: true,
  },

  allowCredit: {
    type: Boolean,
    default: true,
  },

  defaultLimit: {
    type: Number,
    default: 5000,
  },

  maxOverdueDays: {
    type: Number,
    default: 30,
  },

  autoBlockCustomer: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.models.CreditPolicy || mongoose.model(
  "CreditPolicy",
  schema
);
