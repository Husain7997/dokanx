const { Worker } = require("bullmq");
const connection =
require("../infrastructure/queue/queue.connection");

const settlementService =
require("../services/settlement.service");

const worker = new Worker(
  "settlement",
  async (job) => {
    await settlementService.autoSettlement(
      job.data.shopId
    );
  },
  { connection }
);

worker.on("failed", (job, err) => {
  console.error("Settlement failed", err);
});
