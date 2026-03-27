const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema(
  {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true },
    webhook: { type: Boolean, default: true },
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    order: { type: Boolean, default: true },
    payment: { type: Boolean, default: true },
    inventory: { type: Boolean, default: true },
    marketing: { type: Boolean, default: false },
    system: { type: Boolean, default: true },
  },
  { _id: false }
);

const notificationSettingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, index: true },
    channels: { type: channelSchema, default: () => ({}) },
    categories: { type: categorySchema, default: () => ({}) },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.NotificationSetting ||
  mongoose.model("NotificationSetting", notificationSettingSchema);
