const reportService = require("./report.service");

exports.getShopSummary = async (req, res) => {
  const shopId = req.user.shopId;

  const data = await reportService.shopSummary(shopId);

  res.json({
    message: t('common.updated', req.lang),
    data,
  });
};

exports.getAdminKPI = async (req, res) => {
  const data = await reportService.adminKPI();

  res.json({
    message: t('common.updated', req.lang),
    data,
  });
};

exports.getSettlementHistory = async (req, res) => {
  const shopId = req.user.shopId;

  const data = await reportService.settlementHistory(shopId);

  res.json({
    message: t('common.updated', req.lang),
    data,
  });
};
