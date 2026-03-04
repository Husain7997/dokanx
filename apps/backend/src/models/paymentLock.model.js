const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  key: {
    type: String,
    unique: true,
    required: true,
  },
  expiresAt: {
    type: Date,
    index: { expires: 0 },
  },
});


  module.exports =
  mongoose.models.PaymentLock ||
  mongoose.model("PaymentLock", schema);