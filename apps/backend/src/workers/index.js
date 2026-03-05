const { processOutbox } =
  require("../jobs/outbox.worker");

const { registerWalletEvents } =
  require("@/infrastructure/events/wallet.events");



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
const { startPhase2Workers } =
  require("@/workers/phase2");

 

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

    /* 🔥 INVENTORY PROJECTION WORKER */
    setInterval(runInventoryProjection, 1000);

  startSnapshotWorker();
 /* ---------- SYSTEM AGENTS ---------- */
    startRecoveryWorker();
    startAIObserver();
    
registerWalletEvents();
    startPhase2Workers();

    AutonomousEngine.start();
    /* ---------- BOOT VALIDATION ---------- */
    runBootValidation();

    
}

module.exports = {
  registerWorkers,
};
