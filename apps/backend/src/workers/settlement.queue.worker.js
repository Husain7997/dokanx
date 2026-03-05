const { createWorker } = require("@/platform/queue/queue.client");
const { QUEUE_NAMES } = require("@/platform/queue/queues");
const { processSettlement } = require("@/services/settlement.service");

function startSettlementQueueWorker() {
  return createWorker(
    QUEUE_NAMES.SETTLEMENT,
    async (job) => {
      const { shopId, grossAmount, fee = 0, idempotencyKey } = job.data || {};
      if (!shopId || !grossAmount) return { skipped: true };

      return processSettlement({
        shopId,
        grossAmount,
        fee,
        idempotencyKey: idempotencyKey || `settlement_job_${job.id}`
      });
    },
    { concurrency: 5 }
  );
}

module.exports = { startSettlementQueueWorker };
