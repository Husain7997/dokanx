const { queues } = require("./queues");
const { logger } = require("@/core/infrastructure");

async function getDeadLetterReport(sampleSize = 10) {
  const report = {};

  for (const [key, queue] of Object.entries(queues)) {
    const counts = await queue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed"
    );

    const failedJobs = await queue.getFailed(0, Math.max(0, sampleSize - 1));

    report[key] = {
      queueName: queue.name,
      counts,
      failedSamples: failedJobs.map(job => ({
        id: job.id,
        name: job.name,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp
      }))
    };
  }

  return report;
}

function startQueueDeadLetterMonitor({
  intervalMs = 60 * 1000,
  warnThreshold = 25
} = {}) {
  const timer = setInterval(async () => {
    try {
      const report = await getDeadLetterReport(3);
      for (const item of Object.values(report)) {
        const failed = item.counts?.failed || 0;
        if (failed >= warnThreshold) {
          logger.warn(
            {
              queue: item.queueName,
              failed,
              sample: item.failedSamples
            },
            "Queue dead-letter threshold exceeded"
          );
        }
      }
    } catch (err) {
      logger.error({ err: err.message }, "Dead-letter monitor failed");
    }
  }, intervalMs);

  return timer;
}

module.exports = {
  getDeadLetterReport,
  startQueueDeadLetterMonitor
};
