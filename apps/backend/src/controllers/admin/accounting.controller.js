const {
  exportPeriod
} = require('../../services/accountingExport.service');
const FinancePeriod = require('../../models/FinancePeriod');

exports.exportAccounting = async (req, res) => {
  const { period, target } = req.body;

  const fp = await FinancePeriod.findOne({ period });
  if (!fp?.locked) {
    return res.status(400).json({
      message: 'Period must be locked before export'
    });
  }

  const data = await exportPeriod({
    period,
    target,
    actorId: req.user._id
  });

  res.json({
    message: 'Accounting export generated',
    records: data.length,
    data
  });
};
