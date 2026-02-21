const { Queue } = require("bullmq");
const connection = require("./queue.connection");

module.exports = new Queue("settlement", {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 5000 },
  },
});
