const Notification = require("../models/notification.model");
const NotificationSetting = require("../models/notificationSetting.model");
const User = require("../models/user.model");
const { addJob } = require("@/core/infrastructure");
const {
  createReadQuery,
} = require("../infrastructure/database/mongo.client");

const DEFAULT_SETTINGS = {
  channels: {
    email: true,
    sms: false,
    push: true,
    inApp: true,
    webhook: true,
  },
  categories: {
    order: true,
    payment: true,
    inventory: true,
    marketing: false,
    system: true,
  },
};

exports.listNotifications = async (req, res) => {
  const notifications = await createReadQuery(Notification, { userId: req.user._id })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ data: notifications });
};

exports.markRead = async (req, res) => {
  const { notificationId } = req.params;
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId: req.user._id },
    { isRead: true },
    { returnDocument: "after" }
  );
  if (!notification) return res.status(404).json({ message: "Notification not found" });
  res.json({ data: notification });
};

exports.markAllRead = async (req, res) => {
  const result = await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );
  res.json({ updated: result.modifiedCount || 0 });
};

exports.createNotification = async (req, res) => {
  const { userId, title, message, type } = req.body || {};
  if (!userId || !title) return res.status(400).json({ message: "userId and title required" });

  const notification = await Notification.create({
    userId,
    title,
    message: message || "",
    type: type || "INFO",
  });

  res.status(201).json({ data: notification });
};

exports.getSettings = async (req, res) => {
  const settings = await NotificationSetting.findOneAndUpdate(
    { userId: req.user._id },
    { $setOnInsert: { userId: req.user._id } },
    { upsert: true, returnDocument: "after" }
  ).lean();

  res.json({
    data: {
      channels: { ...DEFAULT_SETTINGS.channels, ...(settings?.channels || {}) },
      categories: { ...DEFAULT_SETTINGS.categories, ...(settings?.categories || {}) },
    },
  });
};

exports.updateSettings = async (req, res) => {
  const updates = {};
  if (req.body?.channels) {
    updates["channels"] = {
      ...DEFAULT_SETTINGS.channels,
      ...req.body.channels,
    };
  }
  if (req.body?.categories) {
    updates["categories"] = {
      ...DEFAULT_SETTINGS.categories,
      ...req.body.categories,
    };
  }

  const settings = await NotificationSetting.findOneAndUpdate(
    { userId: req.user._id },
    { $set: updates, $setOnInsert: { userId: req.user._id } },
    { upsert: true, returnDocument: "after" }
  ).lean();

  res.json({
    data: {
      channels: { ...DEFAULT_SETTINGS.channels, ...(settings?.channels || {}) },
      categories: { ...DEFAULT_SETTINGS.categories, ...(settings?.categories || {}) },
    },
  });
};

exports.sendNotification = async (req, res) => {
  const { userId, templateKey, payload, eventType } = req.body || {};
  if (!userId || !templateKey) {
    return res.status(400).json({ message: "userId and templateKey required" });
  }

  await addJob(
    "notification",
    { userId, templateKey, payload: payload || {}, eventType: eventType || templateKey },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  res.status(202).json({ queued: true });
};

exports.registerPushToken = async (req, res) => {
  const token = String(req.body?.token || "").trim();
  if (!token) {
    return res.status(400).json({ message: "token is required" });
  }

  await User.findByIdAndUpdate(
    req.user._id,
    { $addToSet: { pushTokens: token } },
    { returnDocument: "after" }
  );

  res.json({ success: true });
};

exports.unregisterPushToken = async (req, res) => {
  const token = String(req.body?.token || "").trim();
  if (!token) {
    return res.status(400).json({ message: "token is required" });
  }

  await User.findByIdAndUpdate(
    req.user._id,
    { $pull: { pushTokens: token } },
    { returnDocument: "after" }
  );

  res.json({ success: true });
};

