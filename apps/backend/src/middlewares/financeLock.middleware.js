const FinancePeriod = require('../models/FinancePeriod');

module.exports = async function financeLock(req, res, next) {
  const date = new Date();
  const period = `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, '0')}`;

  const fp = await FinancePeriod.findOne({ period });

  if (fp?.locked) {
    return res.status(423).json({
      message: 'Finance period locked'
    });
  }

  next();
};
