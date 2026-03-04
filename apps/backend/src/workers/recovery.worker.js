const { runRecovery } =
  require("@/core/recovery/recovery.engine");

async function startRecoveryWorker() {
  console.log("🤖 Recovery Worker Started");

  setInterval(async () => {
    try {
      await runRecovery();
    } catch (err) {
      console.error("Recovery error:", err.message);
    }
  }, 60 * 1000); // every 1 minute
}

module.exports = { startRecoveryWorker };