// models/notification-campaign.model.js
const mongoose = require('mongoose');

const notificationCampaignSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['SMS', 'EMAIL', 'PUSH', 'IN_APP'], required: true },
  targetAudience: { type: String, enum: ['ALL_USERS', 'ALL_MERCHANTS', 'SPECIFIC_USERS'], required: true },
  targetIds: [{ type: mongoose.Schema.Types.ObjectId }], // user/shop IDs
  status: { type: String, enum: ['DRAFT', 'SCHEDULED', 'SENT', 'FAILED'], default: 'DRAFT' },
  scheduledAt: { type: Date },
  sentAt: { type: Date },
  deliveryStats: {
    total: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    failed: { type: Number, default: 0 }
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

// Indexes
notificationCampaignSchema.index({ status: 1, scheduledAt: 1 });
notificationCampaignSchema.index({ createdBy: 1 });

module.exports = mongoose.model('NotificationCampaign', notificationCampaignSchema);