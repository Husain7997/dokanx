async function sendSMS({ to, message }) {
  return {
    channel: "sms",
    to,
    accepted: Boolean(to && message)
  };
}

module.exports = { sendSMS };
