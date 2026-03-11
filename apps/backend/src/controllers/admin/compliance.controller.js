const FinancePeriod = require('../../models/FinancePeriod');
const ReconciliationReport = require('../../models/ReconciliationReport');
const {
  runPlatformCommissionReconciliation,
  listPlatformCommissionReconciliations,
} = require('@/services/platformCommissionReconciliation.service');

exports.lockPeriod = async (req, res) => {
  const { period } = req.body;

  const fp = await FinancePeriod.findOneAndUpdate(
    { period },
    {
      locked: true,
      lockedAt: new Date(),
      lockedBy: req.user._id
    },
    { upsert: true, returnDocument: "after" }
  );

  res.json({ message: 'Finance period locked', data: fp });
};

exports.reconciliationReports = async (req, res) => {
  const type = String(req.query.type || '').trim().toUpperCase();
  const query = type ? { type } : {};

  const data = await ReconciliationReport.find(query)
    .sort({ date: -1 })
    .limit(30);

  res.json({ data });
};

exports.runPlatformCommissionReconciliation = async (req, res) => {
  const row = await runPlatformCommissionReconciliation(req.body?.date || new Date());
  res.json({ message: 'Platform commission reconciliation completed', data: row });
};

exports.platformCommissionReconciliationReports = async (req, res) => {
  const data = await listPlatformCommissionReconciliations(req.query.limit || 30);
  res.json({ data });
};
