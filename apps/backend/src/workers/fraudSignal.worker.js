const { createWorker } = require("@/platform/queue/queue.client");
const { QUEUE_NAMES } = require("@/platform/queue/queues");
const { logger } = require("@/core/infrastructure");

function startFraudSignalWorker() {
  return createWorker(
    QUEUE_NAMES.AI_SIGNAL,
    async (job) => {
      logger.info({ jobId: job.id, payload: job.data }, "fraud signal evaluated");
      return { ok: true };
    },
    { concurrency: 3 }
  );
}

module.exports = { startFraudSignalWorker };
