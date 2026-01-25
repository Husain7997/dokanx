const { getShopEarningsReport } = require("../services/report.service");

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
