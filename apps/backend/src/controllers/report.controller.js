const { getShopEarningsReport } = require("../services/report.service");

const report =
require("../reports/financial.report");

exports.shopSummary = async (req, res) => {
  const data =
  await report.shopFinancialSummary(
    req.params.shopId
  );

  res.json(data);
};



exports.getShopReport = async (req, res) => {
  const { from, to } = req.query;
  const shopId = req.shop._id;

  const report = await getShopEarningsReport({
    shopId,
    from: new Date(from),
    to: new Date(to)
  });

  res.json({ report });
};
