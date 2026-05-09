const { sendSms, sendWhatsApp } = require("../infrastructure/notifications/sms.provider");

async function sendSMS(to, message) {
  return sendSms(to, message);
}

async function sendMarketingMessage({ to, message, channel = "sms" }) {
  if (String(channel).toLowerCase() === "whatsapp") {
    return sendWhatsApp(to, message);
  }
  return sendSMS(to, message);
}

module.exports = {
  sendMarketingMessage,
  sendSMS,
};
