const cron = require("node-cron");
const { addJob } = require("@/core/infrastructure");

if (process.env.NODE_ENV === "test") {
  module.exports = {
    startSearchReindexCron: () => {},
  };
  return;
}

function startSearchReindexCron() {
  cron.schedule("*/10 * * * *", async () => {
    try {
      await addJob("search-reindex-delta", { triggeredBy: "cron" }, {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: false,
        queueName: "analytics",
      });
    } catch (err) {
      console.error("Search incremental index failed", err);
    }
  });

  cron.schedule("30 3 * * *", async () => {
    try {
      await addJob("search-reindex-full", { triggeredBy: "cron" }, {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: false,
        queueName: "analytics",
      });
    } catch (err) {
      console.error("Search reindex failed", err);
    }
  });
}

module.exports = { startSearchReindexCron };
