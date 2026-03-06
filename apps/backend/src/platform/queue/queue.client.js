let connection = null;
const queues = new Set();
const workers = new Set();
const queueEventsSet = new Set();

if (process.env.NODE_ENV === "test") {
  connection = {
    async quit() {
      return "OK";
    },
    disconnect() {},
  };

  function createQueue(name) {
    const queue = {
      name,
      async add(jobName, payload) {
        return { id: `test-${Date.now()}`, name: jobName, data: payload };
      },
      async getJobCounts() {
        return {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
        };
      },
      async getFailed() {
        return [];
      },
      async close() {},
    };
    queues.add(queue);
    return queue;
  }

  function createWorker(name, processor, opts = {}) {
    const worker = {
      name,
      processor,
      opts,
      async close() {},
    };
    workers.add(worker);
    return worker;
  }

  function createQueueEvents(name) {
    const queueEvents = {
      name,
      async close() {},
    };
    queueEventsSet.add(queueEvents);
    return queueEvents;
  }

  async function closeQueueInfra() {
    workers.clear();
    queueEventsSet.clear();
    queues.clear();
  }

  module.exports = {
    connection,
    createQueue,
    createWorker,
    createQueueEvents,
    closeQueueInfra,
  };
} else {
  const { Queue, Worker, QueueEvents } = require("bullmq");
  const IORedis = require("ioredis");

  connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  function createQueue(name) {
    const queue = new Queue(name, {
      connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    });
    queues.add(queue);
    return queue;
  }

  function createWorker(name, processor, opts = {}) {
    const worker = new Worker(name, processor, {
      connection,
      concurrency: opts.concurrency || 5,
    });
    workers.add(worker);
    return worker;
  }

  function createQueueEvents(name) {
    const queueEvents = new QueueEvents(name, { connection });
    queueEventsSet.add(queueEvents);
    return queueEvents;
  }

  async function closeQueueInfra() {
    for (const worker of workers) {
      await worker.close().catch(() => {});
    }
    workers.clear();

    for (const queueEvents of queueEventsSet) {
      await queueEvents.close().catch(() => {});
    }
    queueEventsSet.clear();

    for (const queue of queues) {
      await queue.close().catch(() => {});
    }
    queues.clear();

    await connection.quit().catch(async () => {
      connection.disconnect();
    });
  }

  module.exports = {
    connection,
    createQueue,
    createWorker,
    createQueueEvents,
    closeQueueInfra,
  };
}
