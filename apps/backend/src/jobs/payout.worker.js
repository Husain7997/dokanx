// src/jobs/payout.worker.js

const { queue, runOnce } =
  require("@/core/infrastructure");

const payoutService =
  require("../services/payout.service");

queue.process(
  "payout",
  async (job) => {

    return runOnce(
      `payout-${job.id}`,
      async () => {
        return payoutService.processPayout(job.data);
      }
    );

  }
);