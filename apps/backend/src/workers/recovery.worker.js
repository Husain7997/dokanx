const { runRecovery } =
  require("@/core/recovery/recovery.engine");

const { safeWorker } = require("@/system/workerWrapper");

const startRecoveryWorker = safeWorker(async () => {
console.log("Recovery worker started");

 
  setInterval(async () => {
    try {
      await runRecovery();
    } catch (err) {
      console.error("Recovery error:", err.message);
    }
  }, 60 * 1000); // every 1 minute

  console.log("Recovery worker completed");
});

module.exports = { startRecoveryWorker };





