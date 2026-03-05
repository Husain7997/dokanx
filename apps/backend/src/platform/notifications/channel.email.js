async function sendEmail({ to, subject, message }) {
  return {
    channel: "email",
    to,
    subject,
    accepted: Boolean(to && subject && message)
  };
}

module.exports = { sendEmail };
