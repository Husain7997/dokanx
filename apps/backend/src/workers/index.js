const { processOutbox } = require("../jobs/outbox.worker");
require("../jobs/notification.worker");
require("./webhook.worker");
require("./payment.worker");
require("./analytics.worker");

const { startSnapshotWorker } = require("../inventory/snapshot/snapshot.worker");
const AutonomousEngine = require("@/core/ai/autonomous.engine");
const { runBootValidation } = require("@/core/boot/boot.validator");
const { runInventoryProjection } = require("./inventory/inventory.consumer");
const { startRecoveryWorker } = require("./recovery.worker");
const { startAIObserver } = require("@/core/ai/agents/ai.observer");
const { startSearchReindexCron } = require("../jobs/searchReindex.job");
const { runShippingSync } = require("../jobs/shippingSync.job");
const { startAnalyticsWarehouseCron } = require("../jobs/analyticsWarehouse.job");
const { startAnalyticsEventCleanupCron } = require("../jobs/analyticsEventCleanup.job");
const { startAiFeatureSnapshotCron } = require("../jobs/aiFeatureSnapshot.job");
const { startOrderNormalizationBackfill } = require("../jobs/orderNormalizationBackfill.job");
const { runInventoryReconciliation } = require("../inventory/reconciliation/reconciliation.worker");

function registerWorkers() {
  console.log("Registering workers...");

  const isDevLite =
    process.env.NODE_ENV === "development" &&
    process.env.ENABLE_HEAVY_DEV_WORKERS !== "true";

  if (isDevLite) {
    console.log("Development worker-lite mode enabled");

    setInterval(processOutbox, 30000);
    setInterval(runInventoryProjection, 10000);

    startRecoveryWorker();
    runBootValidation();
    return;
  }

  setInterval(processOutbox, 5000);
  setInterval(startSnapshotWorker, 1000 * 60 * 60 * 6);
  setInterval(runInventoryReconciliation, 1000 * 60 * 5);
  setInterval(runShippingSync, 1000 * 60 * 10);
  setInterval(runInventoryProjection, 1000);

  startSnapshotWorker();
  startSearchReindexCron();
  startAnalyticsWarehouseCron();
  startAnalyticsEventCleanupCron();
  startAiFeatureSnapshotCron();
  startOrderNormalizationBackfill();
  startRecoveryWorker();
  startAIObserver();
  AutonomousEngine.start();
  runBootValidation();
}

module.exports = {
  registerWorkers,
};
