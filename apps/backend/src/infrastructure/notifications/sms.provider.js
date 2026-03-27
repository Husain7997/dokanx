let twilioClient = null;

function resolveTwilioClient() {
  if (twilioClient) return twilioClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;

  // Lazy import to avoid boot failure when Twilio is not configured.
  // eslint-disable-next-line global-require
  const twilio = require("twilio");
  twilioClient = twilio(accountSid, authToken);
  return twilioClient;
}

async function sendSms(to, body) {
  const from = process.env.TWILIO_FROM;
  if (!to || !body) return { skipped: true };

  const client = resolveTwilioClient();
  if (!client || !from) {
    console.log("SMS_SEND", { to, body });
    return { skipped: true };
  }

  const result = await client.messages.create({ from, to, body });
  return { provider: "twilio", sid: result.sid };
}

module.exports = {
  sendSms,
};
