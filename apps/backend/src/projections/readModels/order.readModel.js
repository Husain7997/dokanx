const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  orderId: String,
  shopId: String,
  total: Number,
  status: String,
}, { timestamps: true });

module.exports = mongoose.model(
  'OrderReadModel',
  schema
);