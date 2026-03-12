// src/jobs/settlement.worker.js

const { queue, runOnce } = require("@/core/infrastructure");
const settlementService = require("../services/settlement.service");
const { safeWorker } = require("@/system/workerWrapper");
const { _internals } = require("@/workers/settlement.queue.worker");

const settlementWorker = safeWorker(async () => {
  console.log("Settlement worker running");

  queue.process("settlement", async (job) => {
    const payload = await _internals.resolveSettlementJobPayload(job);

    return runOnce(
      `settlement-${job.id}`,
      async () => {
        if (!payload || !payload.shopId || !payload.grossAmount) {
          return { skipped: true };
        }

        return settlementService.processSettlement(payload);
      }
    );
  });

  console.log("Settlement worker registered");
});

module.exports = { settlementWorker };
