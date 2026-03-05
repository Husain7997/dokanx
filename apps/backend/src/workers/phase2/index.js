const { logger } = require("@/core/infrastructure");
const { startNotificationWorker } = require("@/workers/notification.worker");
const { startAnalyticsWorker } = require("@/workers/analytics.worker");
const { startFraudSignalWorker } = require("@/workers/fraudSignal.worker");
const { startSettlementQueueWorker } = require("@/workers/settlement.queue.worker");
const { startQueueDeadLetterMonitor } = require("@/platform/queue/deadLetter.monitor");

let started = false;

function startPhase2Workers() {
  if (started) return;
  started = true;

  try {
    startNotificationWorker();
    startAnalyticsWorker();
    startFraudSignalWorker();
    startSettlementQueueWorker();
    startQueueDeadLetterMonitor();
    logger.info("Phase-2 queue workers started");
  } catch (err) {
    logger.error({ err: err.message }, "Phase-2 workers failed to start");
  }
}

module.exports = {
  startPhase2Workers
};
