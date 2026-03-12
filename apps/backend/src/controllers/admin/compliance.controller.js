const FinancePeriod = require('../../models/FinancePeriod');
const ReconciliationReport = require('../../models/ReconciliationReport');
const {
  runPlatformCommissionReconciliation,
  listPlatformCommissionReconciliations,
} = require('@/services/platformCommissionReconciliation.service');
const {
  verifyReconciliation,
  getFinanceAdminDashboard,
  listFinanceExceptions,
  updateFinanceExceptionStatus,
} = require('@/services/financeAssurance.service');

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

exports.runFinanceAssurance = async (req, res) => {
  const result = await verifyReconciliation({
    date: req.body?.date || new Date(),
    shopId: req.body?.shopId || null,
    thresholds: req.body?.thresholds || {},
  });
  res.json({ message: 'Finance assurance reconciliation completed', data: result });
};

exports.financeAssuranceDashboard = async (req, res) => {
  const data = await getFinanceAdminDashboard({
    shopId: req.query.shopId || null,
    days: req.query.days || 7,
  });
  res.json({ data });
};

exports.financeExceptions = async (req, res) => {
  const data = await listFinanceExceptions({
    shopId: req.query.shopId || null,
    status: req.query.status || null,
    limit: req.query.limit || 50,
  });
  res.json({ data });
};

exports.updateFinanceException = async (req, res) => {
  const data = await updateFinanceExceptionStatus({
    exceptionId: req.params.exceptionId,
    status: req.body?.status,
    actorId: req.user?._id || null,
    note: req.body?.note || '',
  });
  res.json({ message: 'Finance exception updated', data });
};
