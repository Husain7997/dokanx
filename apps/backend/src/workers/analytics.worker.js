const { queues, logger } = require("@/core/infrastructure");
const SearchSyncLog = require("../models/searchSyncLog.model");
const {
  collectSignalsForShop,
  predictInventoryRiskFromSignals,
  executeAnalyticsAction,
} = require("../brain/analytics.handlers");
const {
  logSearchQuery,
  logSearchEvent,
} = require("../services/search.service");
const {
  rebuildIndex,
  updateIncrementalIndex,
} = require("../services/searchIndex.service");

queues.analytics.process("collectSignals", 2, async (job) => ({
  ok: true,
  collectedAt: new Date().toISOString(),
  shopId: job.data?.shopId || null,
  signals: await collectSignalsForShop(job.data || {}),
}));

queues.analytics.process("predictInventoryRisk", 2, async (job) => {
  const signals = job.data || {};
  const risk = predictInventoryRiskFromSignals(signals);
  return { ok: true, risk };
});

queues.analytics.process("executeActions", 1, async (job) => {
  const suggestion = await executeAnalyticsAction(job.data || {});
  logger.info({ actionType: job.data?.type || null, queue: "analytics" }, "Processed analytics action");
  return {
    ok: true,
    compatibilityMode: false,
    actionType: job.data?.type || null,
    suggestionId: suggestion?._id || null,
  };
});

queues.analytics.process("search-log-query", 5, async (job) => {
  await logSearchQuery(job.data || {});
  return { ok: true };
});

queues.analytics.process("search-log-event", 5, async (job) => {
  await logSearchEvent(job.data || {});
  return { ok: true };
});

queues.analytics.process("search-reindex-full", 1, async () => {
  try {
    const result = await rebuildIndex();
    await SearchSyncLog.create({
      level: "INFO",
      message: "Full search index completed",
      details: result,
    });
    return { ok: true, mode: "full", ...result };
  } catch (error) {
    await SearchSyncLog.create({
      level: "ERROR",
      message: "Full search index failed",
      details: { error: error.message },
    });
    throw error;
  }
});

queues.analytics.process("search-reindex-delta", 1, async () => {
  try {
    const result = await updateIncrementalIndex();
    await SearchSyncLog.create({
      level: "INFO",
      message: "Delta search index completed",
      details: result,
    });
    return { ok: true, mode: "delta", ...result };
  } catch (error) {
    await SearchSyncLog.create({
      level: "ERROR",
      message: "Delta search index failed",
      details: { error: error.message },
    });
    throw error;
  }
});

module.exports = {
  worker: "analytics",
};
