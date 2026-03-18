const cron = require("node-cron");
const { buildDailySnapshots } = require("../modules/ai-engine/feature-store/feature-store.service");

function startAiFeatureSnapshotCron() {
  if (process.env.AI_FEATURE_SNAPSHOT_CRON !== "true") {
    return;
  }

  cron.schedule("30 3 * * *", async () => {
    try {
      const result = await buildDailySnapshots();
      console.log(`AI feature snapshots built: customers=${result.customers}, products=${result.products}, shops=${result.shops}`);
    } catch (error) {
      console.error("AI feature snapshot cron failed:", error);
    }
  });
}

module.exports = { startAiFeatureSnapshotCron };
