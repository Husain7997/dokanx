const { runRecovery } =
  require("@/core/recovery/recovery.engine");

const { safeWorker } = require("@/system/workerWrapper");
const { logger } = require("@/core/infrastructure");

let recoveryTimer = null;

const startRecoveryWorker = safeWorker(async () => {
  logger.info("Recovery worker starting");

  if (recoveryTimer) {
    return recoveryTimer;
  }
 
  recoveryTimer = setInterval(async () => {
    try {
      await runRecovery();
    } catch (err) {
      logger.error({ err: err.message }, "Recovery worker iteration failed");
    }
  }, 60 * 1000); // every 1 minute

  logger.info("Recovery worker active");
  return recoveryTimer;
});

function stopRecoveryWorker() {
  if (!recoveryTimer) return;
  clearInterval(recoveryTimer);
  recoveryTimer = null;
  logger.info("Recovery worker stopped");
}

module.exports = { startRecoveryWorker, stopRecoveryWorker };





