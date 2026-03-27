const Queue = require("bull");

const redis = require("../infrastructure/redis.client");
const logger = require("../infrastructure/logger");

function createRedisClient(type) {
  switch (type) {
    case "client":
      return redis;
    case "subscriber":
      return redis.duplicate();
    default:
      return redis.duplicate();
  }
}

function normalizeAttempts(value, fallback) {
  const attempts = Number(value);
  return Number.isFinite(attempts) && attempts > 0 ? attempts : fallback;
}

function normalizeBackoff(backoff, fallbackDelay) {
  if (!backoff || typeof backoff !== "object") {
    return { type: "exponential", delay: fallbackDelay };
  }
  return {
    type: backoff.type || "exponential",
    delay: Number(backoff.delay) > 0 ? Number(backoff.delay) : fallbackDelay,
  };
}

function createDomainQueue({ name, defaultAttempts, defaultBackoffDelay }) {
  const queue = new Queue(name, {
    createClient: createRedisClient,
    defaultJobOptions: {
      attempts: defaultAttempts,
      backoff: { type: "exponential", delay: defaultBackoffDelay },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

  const deadLetterQueue = new Queue(`${name}:dead-letter`, {
    createClient: createRedisClient,
    defaultJobOptions: {
      removeOnComplete: false,
      removeOnFail: false,
    },
  });

  queue.on("failed", async (job, error) => {
    const maxAttempts = normalizeAttempts(job.opts?.attempts, defaultAttempts);
    if (job.attemptsMade < maxAttempts) return;

    try {
      await deadLetterQueue.add(
        `${job.name}:dead-letter`,
        {
          originalQueue: name,
          jobName: job.name,
          payload: job.data,
          attemptsMade: job.attemptsMade,
          maxAttempts,
          failedAt: new Date().toISOString(),
          errorMessage: error?.message || "Queue job failed",
        },
        {
          jobId: `dead-letter:${job.id}`,
          removeOnComplete: false,
          removeOnFail: false,
        }
      );
    } catch (deadLetterError) {
      logger.error(
        { err: deadLetterError, queueName: name, jobName: job.name, jobId: job.id },
        "Unable to move queue job to dead-letter queue"
      );
    }
  });

  function add(jobName, data, opts = {}) {
    const attempts = normalizeAttempts(opts.attempts, defaultAttempts);
    const backoff = normalizeBackoff(opts.backoff, defaultBackoffDelay);

    return queue.add(jobName, data, {
      ...opts,
      attempts,
      backoff,
    });
  }

  async function getStatus() {
    const [counts, deadLetterCounts] = await Promise.all([
      queue.getJobCounts(),
      deadLetterQueue.getJobCounts(),
    ]);

    return {
      name,
      counts,
      deadLetter: deadLetterCounts,
    };
  }

  function process(...args) {
    return queue.process(...args);
  }

  return {
    name,
    queue,
    deadLetterQueue,
    process,
    add,
    getStatus,
    settings: {
      attempts: defaultAttempts,
      backoff: { type: "exponential", delay: defaultBackoffDelay },
    },
  };
}

module.exports = {
  createDomainQueue,
};
