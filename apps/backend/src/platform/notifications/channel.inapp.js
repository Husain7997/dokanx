const Notification = require("@/models/notification.model");

async function sendInApp({ userId, message, data = {} }) {
  if (!userId || !message) {
    return { channel: "inapp", accepted: false };
  }

  const row = await Notification.create({
    userId,
    message,
    data
  });

  return {
    channel: "inapp",
    accepted: true,
    id: row._id
  };
}

module.exports = { sendInApp };
