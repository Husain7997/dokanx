const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  apiKey: {
    type: String,
    unique: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('PlatformKey', schema);