const { queues, runOnce } = require("@/core/infrastructure");

const settlementService = require("../services/settlement.service");
const payoutService = require("../services/payout.service");

queues.payments.process("settlement", 5, async (job) => {
  const { shopId, grossAmount, fee } = job.data;

  return runOnce(`settlement-${shopId}-${job.id}`, async () =>
    settlementService.processSettlement({
      shopId,
      grossAmount,
      fee,
      idempotencyKey: job.id,
    })
  );
});

queues.payments.process("payout", 2, async (job) =>
  runOnce(`payout-${job.id}`, async () => payoutService.processPayout(job.data))
);

module.exports = {
  worker: "payments",
};
