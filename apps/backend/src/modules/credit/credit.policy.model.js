const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  shop: ObjectId,

  allowCredit: Boolean,

  defaultLimit: Number,

  maxOverdueDays: Number,

  autoBlockCustomer: Boolean,
});

module.exports = mongoose.model(
  "CreditPolicy",
  schema
);