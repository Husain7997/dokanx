const { runDailyReconciliation } = require('../services/reconciliation.service');

exports.execute = async () => {
  const today = new Date().toISOString().slice(0, 10);
  await runDailyReconciliation(today);
};
