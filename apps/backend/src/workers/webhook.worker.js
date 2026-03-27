const axios = require("axios");
const crypto = require("crypto");

const { queues, addJob, logger } = require("@/core/infrastructure");
const WebhookJob = require("../models/webhook-job.model");
const WebhookSubscription = require("../models/webhookSubscription.model");
const { decryptSecret } = require("../utils/crypto.util");
const { recordPlatformAudit } = require("../modules/platform-hardening/platform-audit.service");

function sign(secret, payload) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function getDelayMs(retryCount) {
  return Math.min(1000 * 60 * 30, 1000 * Math.pow(2, retryCount));
}

queues.webhooks.process("webhook-delivery", 5, async (job) => {
  const webhookJob = await WebhookJob.findById(job.data.webhookJobId);
  if (!webhookJob) return { skipped: true };
  if (webhookJob.status === "success" || webhookJob.status === "dead_letter") return { skipped: true };

  const subscription = await WebhookSubscription.findById(webhookJob.subscriptionId);
  if (!subscription || subscription.status !== "ACTIVE") {
    webhookJob.status = "failed";
    webhookJob.lastError = "Webhook subscription unavailable";
    await webhookJob.save();
    return { skipped: true };
  }

  const body = JSON.stringify({
    event: webhookJob.event,
    payload: webhookJob.payload,
    createdAt: new Date().toISOString(),
  });

  const secret = decryptSecret(subscription.secretCipher, subscription.secretIv) || "";

  try {
    const response = await axios.post(subscription.url, body, {
      headers: {
        "Content-Type": "application/json",
        "x-dokanx-signature": sign(secret, body),
        "x-dokanx-event": webhookJob.event,
        "x-dokanx-delivery-id": webhookJob.deliveryId,
        "x-dokanx-delivery-attempt": String(webhookJob.retryCount + 1),
      },
      timeout: 8000,
    });

    webhookJob.status = "success";
    webhookJob.deliveredAt = new Date();
    webhookJob.lastError = null;
    webhookJob.lastStatusCode = response.status;
    await webhookJob.save();

    subscription.failureCount = 0;
    subscription.lastFailureAt = null;
    subscription.lastDeliveredAt = new Date();
    await subscription.save();

    await recordPlatformAudit({
      action: "WEBHOOK_DELIVERED",
      category: "webhook",
      appId: webhookJob.appId || null,
      shopId: webhookJob.shopId || null,
      path: subscription.url,
      statusCode: response.status,
      metadata: { event: webhookJob.event, webhookJobId: webhookJob._id },
    });

    return { ok: true };
  } catch (error) {
    webhookJob.retryCount += 1;
    webhookJob.lastError = error.message;
    webhookJob.lastStatusCode = error.response?.status || null;

    if (webhookJob.retryCount >= Number(webhookJob.maxRetries || 5)) {
      webhookJob.status = "dead_letter";
      webhookJob.nextRetryAt = null;
    } else {
      webhookJob.status = "pending";
      webhookJob.nextRetryAt = new Date(Date.now() + getDelayMs(webhookJob.retryCount));
      await addJob(
        "webhook-delivery",
        { webhookJobId: webhookJob._id },
        { delay: getDelayMs(webhookJob.retryCount), queueName: "webhooks" }
      );
    }

    await webhookJob.save();
    subscription.failureCount = Number(subscription.failureCount || 0) + 1;
    subscription.lastFailureAt = new Date();
    await subscription.save();

    logger.error({ err: error, webhookJobId: webhookJob._id }, "Webhook delivery failed");
    await recordPlatformAudit({
      action: "WEBHOOK_FAILED",
      category: "webhook",
      appId: webhookJob.appId || null,
      shopId: webhookJob.shopId || null,
      path: subscription.url,
      statusCode: error.response?.status || null,
      metadata: { event: webhookJob.event, webhookJobId: webhookJob._id, retryCount: webhookJob.retryCount },
    });
    return { ok: false };
  }
});

queues.webhooks.process("sandbox-webhook-simulation", 2, async (job) => {
  const { dispatchWebhooks } = require("../services/webhook.service");
  await dispatchWebhooks(job.data?.event, job.data?.payload || {});
  return { ok: true };
});

module.exports = {
  worker: "webhooks",
};
