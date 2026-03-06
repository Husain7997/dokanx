const { runRecovery } =
  require("@/core/recovery/recovery.engine");

const { safeWorker } = require("@/system/workerWrapper");

let recoveryTimer = null;

const startRecoveryWorker = safeWorker(async () => {
console.log("Recovery worker started");

  if (recoveryTimer) {
    return recoveryTimer;
  }
 
  recoveryTimer = setInterval(async () => {
    try {
      await runRecovery();
    } catch (err) {
      console.error("Recovery error:", err.message);
    }
  }, 60 * 1000); // every 1 minute

  console.log("Recovery worker completed");
  return recoveryTimer;
});

function stopRecoveryWorker() {
  if (!recoveryTimer) return;
  clearInterval(recoveryTimer);
  recoveryTimer = null;
}

module.exports = { startRecoveryWorker, stopRecoveryWorker };





