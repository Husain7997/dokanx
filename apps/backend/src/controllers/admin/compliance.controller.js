const FinancePeriod = require('../../models/FinancePeriod');
const ReconciliationReport = require('../../models/ReconciliationReport');

exports.lockPeriod = async (req, res) => {
  const { period } = req.body;

  const fp = await FinancePeriod.findOneAndUpdate(
    { period },
    {
      locked: true,
      lockedAt: new Date(),
      lockedBy: req.user._id
    },
    { upsert: true, new: true }
  );

  res.json({ message: 'Finance period locked', data: fp });
};

exports.reconciliationReports = async (req, res) => {
  const data = await ReconciliationReport.find()
    .sort({ date: -1 })
    .limit(30);

  res.json({ data });
};
