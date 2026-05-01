// models/device.model.js
const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  deviceId: { type: String, required: true, unique: true },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  type: { type: String, enum: ['POS_TERMINAL', 'MOBILE_APP'], default: 'POS_TERMINAL' },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
  lastSeen: { type: Date },
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  firmwareVersion: { type: String },
  registeredAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
deviceSchema.index({ shopId: 1, status: 1 });
deviceSchema.index({ deviceId: 1 });

module.exports = mongoose.model('Device', deviceSchema);