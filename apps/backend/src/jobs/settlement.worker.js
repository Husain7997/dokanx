// src/jobs/settlement.worker.js

const { queue, runOnce } =
  require("@/core/infrastructure");

const settlementService =
  require("../services/settlement.service");

queue.process(
  "settlement",
  async (job) => {

    const { shopId, grossAmount, fee } =
      job.data;

    return runOnce(
      `settlement-${shopId}-${job.id}`,
      async () => {

        return settlementService.processSettlement({
          shopId,
          grossAmount,
          fee,
          idempotencyKey: job.id,
        });

      }
    );
  }
);