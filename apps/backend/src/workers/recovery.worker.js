const { runRecovery } = require("@/core/recovery/recovery.engine");

async function startRecoveryWorker() {
  console.log("Recovery Worker Started");

  if (process.env.NODE_ENV === "development" && process.env.ENABLE_DEV_RECOVERY !== "true") {
    console.log("Recovery Worker Skipped In Development");
    return;
  }

  const intervalMs = Number(process.env.RECOVERY_INTERVAL_MS || 60 * 1000);
  let running = false;

  setInterval(async () => {
    if (running) {
      return;
    }

    running = true;
    try {
      await runRecovery();
    } catch (err) {
      console.error("Recovery error:", err.message);
    } finally {
      running = false;
    }
  }, intervalMs);
}

module.exports = { startRecoveryWorker };
