const { runDailyReconciliation } = require('../services/reconciliation.service');
const { addJob } = require("@/core/infrastructure");



exports.execute = async () => {
  const today = new Date().toISOString().slice(0, 10);
  await runDailyReconciliation(today);
  await addJob("settlement", { date: today });
};
