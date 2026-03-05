const { createWorker } = require("@/platform/queue/queue.client");
const { QUEUE_NAMES } = require("@/platform/queue/queues");
const { sendSMS } = require("@/platform/notifications/channel.sms");
const { sendEmail } = require("@/platform/notifications/channel.email");
const { sendPush } = require("@/platform/notifications/channel.push");
const { sendInApp } = require("@/platform/notifications/channel.inapp");

function startNotificationWorker() {
  return createWorker(
    QUEUE_NAMES.NOTIFICATION,
    async (job) => {
      const { channels = [], ...payload } = job.data || {};
      const results = [];

      for (const channel of channels) {
        if (channel === "sms") results.push(await sendSMS(payload));
        if (channel === "email") results.push(await sendEmail(payload));
        if (channel === "push") results.push(await sendPush(payload));
        if (channel === "inapp") results.push(await sendInApp(payload));
      }

      return { ok: true, results };
    },
    { concurrency: 10 }
  );
}

module.exports = { startNotificationWorker };
