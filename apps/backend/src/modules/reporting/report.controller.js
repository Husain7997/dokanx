const reportService = require("./report.service");

exports.getShopSummary = async (req, res) => {
  const shopId = req.user.shop;

  const data = await reportService.shopSummary(shopId);

  res.json({
    success: true,
    data,
  });
};

exports.getAdminKPI = async (req, res) => {
  const data = await reportService.adminKPI();

  res.json({
    success: true,
    data,
  });
};

exports.getSettlementHistory = async (req, res) => {
  const shopId = req.user.shop;

  const data = await reportService.settlementHistory(shopId);

  res.json({
    success: true,
    data,
  });
};
