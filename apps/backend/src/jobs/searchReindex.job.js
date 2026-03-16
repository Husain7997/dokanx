const cron = require("node-cron");
const { rebuildIndex, updateIncrementalIndex } = require("../services/searchIndex.service");

if (process.env.NODE_ENV === "test") {
  module.exports = {
    startSearchReindexCron: () => {},
  };
  return;
}

function startSearchReindexCron() {
  cron.schedule("*/10 * * * *", async () => {
    try {
      await updateIncrementalIndex();
    } catch (err) {
      console.error("Search incremental index failed", err);
    }
  });

  cron.schedule("30 3 * * *", async () => {
    try {
      await rebuildIndex();
    } catch (err) {
      console.error("Search reindex failed", err);
    }
  });
}

module.exports = { startSearchReindexCron };
