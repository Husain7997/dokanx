const { Worker } = require("bullmq");
const connection =
require("../infrastructure/queue/queue.connection");

const payoutService =
require("../services/payout.service");

const worker = new Worker(
  "payout",
  async (job) => {
    await payoutService.processPayout(job.data);
  },
  { connection }
);
