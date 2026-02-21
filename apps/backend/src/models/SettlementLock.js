const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, unique: true },
  lockedAt: Date,
});

module.exports = mongoose.model('SettlementLock', schema);
