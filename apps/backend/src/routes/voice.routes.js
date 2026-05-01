const express = require("express");
const router = express.Router();
const twilio = require("twilio");

// Twilio credentials from env
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_NUMBER;
const baseUrl = process.env.BASE_URL || "https://api.dokanx.com";

const client = twilio(accountSid, authToken);

// Trigger call function
async function triggerCall(order) {
  try {
    await client.calls.create({
      to: order.phone,
      from: twilioNumber,
      url: `${baseUrl}/voice/start?orderId=${order.id}`,
      method: "POST"
    });
    console.log(`Call triggered for order ${order.id}`);
  } catch (error) {
    console.error("Error triggering call:", error);
  }
}

// Voice start endpoint
router.post("/start", (req, res) => {
  const orderId = req.query.orderId;
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  const gather = twiml.gather({
    numDigits: 1,
    action: `/voice/handle?orderId=${orderId}`,
    method: "POST"
  });

  gather.say(
    { language: "bn-BD" },
    "আপনি একটি অর্ডার করেছেন। কনফার্ম করতে ১ চাপুন, বাতিল করতে ২ চাপুন।"
  );

  res.type("text/xml");
  res.send(twiml.toString());
});

// Voice handle endpoint
router.post("/handle", async (req, res) => {
  const digit = req.body.Digits;
  const orderId = req.query.orderId;

  // Assume order model and functions exist
  const Order = require("../models/order.model");

  if (digit === "1") {
    await Order.findByIdAndUpdate(orderId, { status: "confirmed" });
  } else {
    await Order.findByIdAndUpdate(orderId, { status: "cancelled" });
  }

  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say("ধন্যবাদ");

  res.type("text/xml");
  res.send(twiml.toString());
});

module.exports = router;