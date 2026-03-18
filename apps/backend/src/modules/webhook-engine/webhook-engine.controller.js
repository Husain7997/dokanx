const WebhookSubscription = require("../../models/webhookSubscription.model");
const WebhookJob = require("../../models/webhook-job.model");

exports.getHealth = async (_req, res) => {
  const [active, failing, pendingJobs, failedJobs] = await Promise.all([
    WebhookSubscription.countDocuments({ status: "ACTIVE" }),
    WebhookSubscription.countDocuments({ status: "ACTIVE", failureCount: { $gt: 0 } }),
    WebhookJob.countDocuments({ status: "pending" }),
    WebhookJob.countDocuments({ status: "failed" }),
  ]);

  res.json({
    data: {
      active,
      failing,
      pendingJobs,
      failedJobs,
    },
  });
};
