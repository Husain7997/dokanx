const Notification = require("../models/notification.model");

exports.listNotifications = async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ data: notifications });
};

exports.markRead = async (req, res) => {
  const { notificationId } = req.params;
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId: req.user._id },
    { isRead: true },
    { new: true }
  );
  if (!notification) return res.status(404).json({ message: "Notification not found" });
  res.json({ data: notification });
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
