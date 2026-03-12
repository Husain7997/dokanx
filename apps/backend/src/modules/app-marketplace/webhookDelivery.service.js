const crypto = require("crypto");
const axios = require("axios");
const AppWebhook = require("./models/appWebhook.model");
const AppWebhookDelivery = require("./models/appWebhookDelivery.model");

function hashSecret(secret) {
  return crypto.createHash("sha256").update(String(secret || "")).digest("hex");
}

function signPayload(secret, payload) {
  return crypto
    .createHmac("sha256", String(secret || ""))
    .update(JSON.stringify(payload || {}))
    .digest("hex");
}

function computeRetryDelayMs(attemptCount) {
  const attempt = Math.max(Number(attemptCount) || 1, 1);
  return Math.min(15 * 60 * 1000, 30 * 1000 * Math.pow(2, attempt - 1));
}

async function registerWebhook({ appId, shopId, actorId, payload }) {
  const rawSecret = String(payload.secret || crypto.randomBytes(16).toString("hex"));
  const row = await AppWebhook.findOneAndUpdate(
    {
      appId,
      shopId,
      eventName: String(payload.eventName || "").trim().toUpperCase(),
      targetUrl: String(payload.targetUrl || "").trim(),
    },
    {
      $set: {
        status: "ACTIVE",
        secretHash: hashSecret(rawSecret),
        installedBy: actorId || null,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
    }
  );

  return {
    webhook: row,
    secret: rawSecret,
  };
}

async function listWebhooks({ shopId, appId = null }) {
  const query = { shopId, status: "ACTIVE" };
  if (appId) query.appId = appId;

  return AppWebhook.find(query).sort({ createdAt: -1 }).lean();
}

async function deliverEvent({ eventName, payload }) {
  const upperEvent = String(eventName || "").trim().toUpperCase();
  const shopId = payload?.shopId || payload?.tenantId || null;
  if (!shopId) return [];

  const webhooks = await AppWebhook.find({
    shopId,
    eventName: upperEvent,
    status: "ACTIVE",
  }).select("+secretHash");

  const deliveries = [];
  for (const webhook of webhooks) {
    const requestBody = {
      eventName: upperEvent,
      shopId,
      payload,
    };
    const row = await AppWebhookDelivery.create({
      webhookId: webhook._id,
      appId: webhook.appId,
      shopId,
      eventName: upperEvent,
      targetUrl: webhook.targetUrl,
      status: "QUEUED",
      requestBody,
      responseBody: {
        signature: signPayload(webhook.secretHash, requestBody),
      },
      deliveredAt: null,
    });

    await dispatchWebhook(row);

    deliveries.push(row);
  }

  return deliveries;
}

async function dispatchWebhook(delivery) {
  const executeLive = String(process.env.APP_WEBHOOK_EXECUTE_REQUESTS || "false") === "true";
  const signature = delivery?.responseBody?.signature || "";
  const maxAttempts = Math.max(Number(process.env.APP_WEBHOOK_MAX_ATTEMPTS || 5), 1);

  if (!executeLive) {
    delivery.status = "QUEUED";
    delivery.attemptCount = Number(delivery.attemptCount || 0) + 1;
    delivery.deliveredAt = new Date();
    if (typeof delivery.save === "function") await delivery.save();
    return delivery;
  }

  try {
    const response = await axios({
      method: "POST",
      url: delivery.targetUrl,
      headers: {
        "content-type": "application/json",
        "x-dokanx-signature": signature,
      },
      data: delivery.requestBody,
      timeout: Number(process.env.APP_WEBHOOK_TIMEOUT_MS || 5000),
      validateStatus: () => true,
    });

    delivery.attemptCount = Number(delivery.attemptCount || 0) + 1;
    delivery.responseStatus = response.status;
    delivery.responseBody = {
      ...(delivery.responseBody || {}),
      body: response.data,
    };
    delivery.status = response.status >= 200 && response.status < 300 ? "DELIVERED" : "FAILED";
    delivery.errorMessage = delivery.status === "FAILED" ? `Webhook returned ${response.status}` : "";
    delivery.nextRetryAt = delivery.status === "FAILED"
      ? new Date(Date.now() + computeRetryDelayMs(delivery.attemptCount))
      : null;
    delivery.deadLetteredAt = delivery.status === "FAILED" && delivery.attemptCount >= maxAttempts
      ? new Date()
      : null;
    delivery.deliveredAt = new Date();
    if (typeof delivery.save === "function") await delivery.save();
    return delivery;
  } catch (err) {
    delivery.attemptCount = Number(delivery.attemptCount || 0) + 1;
    delivery.status = "FAILED";
    delivery.errorMessage = String(err.message || "Webhook delivery failed");
    delivery.nextRetryAt = new Date(Date.now() + computeRetryDelayMs(delivery.attemptCount));
    delivery.deadLetteredAt = delivery.attemptCount >= maxAttempts ? new Date() : null;
    delivery.deliveredAt = new Date();
    if (typeof delivery.save === "function") await delivery.save();
    return delivery;
  }
}

async function processRetryBatch({ limit = 20 } = {}) {
  const rows = await AppWebhookDelivery.find({
    status: "FAILED",
    deadLetteredAt: null,
    nextRetryAt: { $lte: new Date() },
  })
    .sort({ nextRetryAt: 1 })
    .limit(Math.min(Math.max(Number(limit) || 20, 1), 100));

  let retried = 0;
  let deadLettered = 0;

  for (const row of rows) {
    await dispatchWebhook(row);
    retried += 1;
    if (row.deadLetteredAt) deadLettered += 1;
  }

  return {
    retried,
    deadLettered,
  };
}

async function listDeadLetters({ limit = 50, shopId = null } = {}) {
  const query = {
    deadLetteredAt: { $ne: null },
  };
  if (shopId) query.shopId = shopId;

  return AppWebhookDelivery.find(query)
    .sort({ deadLetteredAt: -1, updatedAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 50, 1), 200))
    .lean();
}

module.exports = {
  registerWebhook,
  listWebhooks,
  deliverEvent,
  dispatchWebhook,
  processRetryBatch,
  listDeadLetters,
  _internals: {
    hashSecret,
    signPayload,
    computeRetryDelayMs,
  },
};
