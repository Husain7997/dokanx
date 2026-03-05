async function sendPush({ userId, title, message }) {
  return {
    channel: "push",
    userId,
    title,
    accepted: Boolean(userId && title && message)
  };
}

module.exports = { sendPush };
