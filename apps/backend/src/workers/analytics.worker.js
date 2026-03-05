const { createWorker } = require("@/platform/queue/queue.client");
const { QUEUE_NAMES } = require("@/platform/queue/queues");
const { logger } = require("@/core/infrastructure");

function startAnalyticsWorker() {
  return createWorker(
    QUEUE_NAMES.ANALYTICS,
    async (job) => {
      logger.info({ jobId: job.id, name: job.name }, "analytics job processed");
      return { ok: true };
    },
    { concurrency: 5 }
  );
}

module.exports = { startAnalyticsWorker };
