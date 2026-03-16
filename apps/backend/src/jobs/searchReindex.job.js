const cron = require("node-cron");
const { rebuildIndex, updateIncrementalIndex } = require("../services/searchIndex.service");
const SearchSyncLog = require("../models/searchSyncLog.model");

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
      await SearchSyncLog.create({
        level: "INFO",
        message: "Delta search index completed",
      });
    } catch (err) {
      console.error("Search incremental index failed", err);
      await SearchSyncLog.create({
        level: "ERROR",
        message: "Delta search index failed",
        details: { error: err.message },
      });
    }
  });

  cron.schedule("30 3 * * *", async () => {
    try {
      await rebuildIndex();
      await SearchSyncLog.create({
        level: "INFO",
        message: "Full search index completed",
      });
    } catch (err) {
      console.error("Search reindex failed", err);
      await SearchSyncLog.create({
        level: "ERROR",
        message: "Full search index failed",
        details: { error: err.message },
      });
    }
  });
}

module.exports = { startSearchReindexCron };
