const { processOutbox } = require("../jobs/outbox.worker");
const { registerWalletEvents } = require("@/infrastructure/events/wallet.events");
const { startSnapshotWorker } = require("../inventory/snapshot/snapshot.worker");
const AutonomousEngine = require("@/core/ai/autonomous.engine");
const { runBootValidation } = require("@/core/boot/boot.validator");
const { runInventoryProjection } = require("./inventory/inventory.consumer");
const { startRecoveryWorker, stopRecoveryWorker } = require("./recovery.worker");
const { startAIObserver } = require("@/core/ai/agents/ai.observer");
const { startPhase2Workers, stopPhase2Workers } = require("@/workers/phase2");
const { runInventoryReconciliation } = require("../inventory/reconciliation/reconciliation.worker");

function registerWorkers() {
  console.log("Registering workers...");
  const timers = [];

  timers.push(setInterval(processOutbox, 5000));
  timers.push(setInterval(startSnapshotWorker, 1000 * 60 * 60 * 6));
  timers.push(setInterval(runInventoryReconciliation, 1000 * 60 * 5));
  timers.push(setInterval(runInventoryProjection, 1000));

  startSnapshotWorker();
  startRecoveryWorker();
  startAIObserver();
  registerWalletEvents();
  startPhase2Workers();
  AutonomousEngine.start();
  runBootValidation();

  return async function stopWorkers() {
    for (const timer of timers) clearInterval(timer);
    stopRecoveryWorker();
    await stopPhase2Workers();
  };
}

module.exports = { registerWorkers };
