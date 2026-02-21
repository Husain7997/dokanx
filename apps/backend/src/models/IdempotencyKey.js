const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  hash: { type: String, unique: true },
  scope: String,
  createdAt: { type: Date, expires: 60 * 60 * 24 }, // 24h
});

module.exports = mongoose.model('IdempotencyKey', schema);
