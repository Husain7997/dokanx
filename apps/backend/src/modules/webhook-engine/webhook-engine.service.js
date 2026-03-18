const { addJob } = require("../../core/infrastructure");
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
    const webhookJob = await WebhookJob.create({
      subscriptionId: subscription._id,
      appId: subscription.appId || null,
      shopId: payload?.shopId || null,
      event,
      payload,
      targetUrl: subscription.url,
      status: "pending",
      retryCount: 0,
      nextRetryAt: new Date(),
    });
    await addJob("webhook-delivery", { webhookJobId: webhookJob._id }, { removeOnComplete: true });
  }
}

module.exports = {
  dispatch,
};
