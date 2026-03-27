const { addJob } = require("../../core/infrastructure");
const crypto = require("crypto");
const AppInstallation = require("../../models/appInstallation.model");
const WebhookSubscription = require("../../models/webhookSubscription.model");
const WebhookJob = require("../../models/webhook-job.model");

async function shouldDeliver(subscription, payload) {
  if (!subscription.appId || !payload?.shopId) return true;
  const installation = await AppInstallation.findOne({
    appId: subscription.appId,
    shopId: payload.shopId,
    status: "INSTALLED",
  }).lean();
  return Boolean(installation);
}

async function dispatch(event, payload) {
  const subscriptions = await WebhookSubscription.find({
    status: "ACTIVE",
    events: event,
  });

  for (const subscription of subscriptions) {
    if (!(await shouldDeliver(subscription, payload))) {
      continue;
    }
    const payloadString = JSON.stringify(payload || {});
    const dedupeKey = crypto
      .createHash("sha256")
      .update(`${subscription._id}:${event}:${payloadString}`)
      .digest("hex");
    const deliveryId = crypto.randomUUID();
    const result = await WebhookJob.findOneAndUpdate(
      { dedupeKey },
      {
        $setOnInsert: {
          subscriptionId: subscription._id,
          appId: subscription.appId || null,
          shopId: payload?.shopId || null,
          event,
          payload,
          targetUrl: subscription.url,
          deliveryId,
          dedupeKey,
          status: "pending",
          retryCount: 0,
          nextRetryAt: new Date(),
        },
      },
      { upsert: true, new: true, includeResultMetadata: true }
    );
    const webhookJob = result.value || result;
    const createdNow = Boolean(result?.lastErrorObject?.upserted);
    if (!createdNow || webhookJob.status === "success" || webhookJob.status === "dead_letter") {
      continue;
    }
    await addJob("webhook-delivery", { webhookJobId: webhookJob._id }, { removeOnComplete: true, jobId: webhookJob.deliveryId });
  }
}

module.exports = {
  dispatch,
};
