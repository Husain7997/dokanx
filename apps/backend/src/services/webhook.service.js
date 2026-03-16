const axios = require("axios");
const crypto = require("crypto");

const WebhookSubscription = require("../models/webhookSubscription.model");
const { decryptSecret } = require("../utils/crypto.util");

function signPayload(secret, payload) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

async function deliverWebhook(subscription, event, payload) {
  const secret = decryptSecret(subscription.secretCipher, subscription.secretIv) || "";
  const body = JSON.stringify({
    event,
    payload,
    createdAt: new Date().toISOString(),
  });
  const signature = signPayload(secret, body);

  let attempt = 0;
  let lastError = null;

  while (attempt < 3) {
    try {
      await axios.post(subscription.url, body, {
        headers: {
          "Content-Type": "application/json",
          "x-dokanx-signature": signature,
          "x-dokanx-event": event,
        },
        timeout: 8000,
      });
      return { success: true };
    } catch (error) {
      lastError = error;
      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }

  return { success: false, error: lastError };
}

async function dispatchWebhooks(event, payload) {
  const subscriptions = await WebhookSubscription.find({
    status: "ACTIVE",
    events: event,
  });

  for (const subscription of subscriptions) {
    const result = await deliverWebhook(subscription, event, payload);
    if (!result.success) {
      subscription.failureCount = (subscription.failureCount || 0) + 1;
      subscription.lastFailureAt = new Date();
      await subscription.save();
    } else {
      subscription.failureCount = 0;
      subscription.lastFailureAt = null;
      await subscription.save();
    }
  }
}

module.exports = {
  dispatchWebhooks,
};
