const { queues, logger } = require("@/core/infrastructure");
const {
  collectSignalsForShop,
  predictInventoryRiskFromSignals,
  executeAnalyticsAction,
} = require("../brain/analytics.handlers");

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

module.exports = {
  worker: "analytics",
};
