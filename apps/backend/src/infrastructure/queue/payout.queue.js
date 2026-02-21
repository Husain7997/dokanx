const { Queue } = require("bullmq");
const connection = require("./queue.connection");

module.exports = new Queue("payout", {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 5000 },
  },
});
