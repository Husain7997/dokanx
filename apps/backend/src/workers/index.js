const { processOutbox } =
  require("../jobs/outbox.worker");
require("../jobs/notification.worker");
require("../jobs/webhook.worker");



const { startSnapshotWorker } =
  require("../inventory/snapshot/snapshot.worker");
const AutonomousEngine =
  require("@/core/ai/autonomous.engine");
  
const { runBootValidation } =
  require("@/core/boot/boot.validator");

const {
  runInventoryProjection
} =
require("./inventory/inventory.consumer");


const { startRecoveryWorker } =
  require("./recovery.worker");

const { startAIObserver } =
  require("@/core/ai/agents/ai.observer");

const { startSearchReindexCron } =
  require("../jobs/searchReindex.job");

const { runShippingSync } =
  require("../jobs/shippingSync.job");

const { startAnalyticsWarehouseCron } =
  require("../jobs/analyticsWarehouse.job");
const { startAnalyticsEventCleanupCron } =
  require("../jobs/analyticsEventCleanup.job");
 

  const {
  runInventoryReconciliation
} =
require("../inventory/reconciliation/reconciliation.worker");



function registerWorkers() {

  console.log("🔁 Registering workers...");

  setInterval(processOutbox, 5000);

    setInterval(startSnapshotWorker, 1000 * 60 * 60 * 6);

    setInterval(
  runInventoryReconciliation,
  1000 * 60 * 5
);

    setInterval(runShippingSync, 1000 * 60 * 10);

    /* 🔥 INVENTORY PROJECTION WORKER */
    setInterval(runInventoryProjection, 1000);

  startSnapshotWorker();
  startSearchReindexCron();
  startAnalyticsWarehouseCron();
  startAnalyticsEventCleanupCron();
 /* ---------- SYSTEM AGENTS ---------- */
    startRecoveryWorker();
    startAIObserver();
    
    AutonomousEngine.start();
    /* ---------- BOOT VALIDATION ---------- */
    runBootValidation();

    
}

module.exports = {
  registerWorkers,
};
