const { Queue, Worker, QueueEvents } = require("bullmq");
const IORedis = require("ioredis");

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null
});

function createQueue(name) {
  return new Queue(name, {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 1000
      },
      removeOnComplete: 1000,
      removeOnFail: 1000
    }
  });
}

function createWorker(name, processor, opts = {}) {
  return new Worker(name, processor, {
    connection,
    concurrency: opts.concurrency || 5
  });
}

function createQueueEvents(name) {
  return new QueueEvents(name, { connection });
}

module.exports = {
  connection,
  createQueue,
  createWorker,
  createQueueEvents
};
