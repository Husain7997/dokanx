const { logger } = require("@/core/infrastructure");
const { startNotificationWorker } = require("@/workers/notification.worker");
const { startAnalyticsWorker } = require("@/workers/analytics.worker");
const { startFraudSignalWorker } = require("@/workers/fraudSignal.worker");
const { startSettlementQueueWorker } = require("@/workers/settlement.queue.worker");
const { startQueueDeadLetterMonitor } = require("@/platform/queue/deadLetter.monitor");

let started = false;
let monitorTimer = null;
const workerRefs = [];

function startPhase2Workers() {
  if (started) return;
  started = true;

  try {
    workerRefs.push(startNotificationWorker());
    workerRefs.push(startAnalyticsWorker());
    workerRefs.push(startFraudSignalWorker());
    workerRefs.push(startSettlementQueueWorker());
    monitorTimer = startQueueDeadLetterMonitor();
    logger.info("Phase-2 queue workers started");
  } catch (err) {
    logger.error({ err: err.message }, "Phase-2 workers failed to start");
  }
}

async function stopPhase2Workers() {
  if (!started) return;

  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }

  while (workerRefs.length) {
    const worker = workerRefs.pop();
    if (worker?.close) {
      await worker.close().catch(() => {});
    }
  }

  started = false;
}

module.exports = {
  startPhase2Workers,
  stopPhase2Workers
};
