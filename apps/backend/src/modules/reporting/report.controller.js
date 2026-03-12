const reportService = require("./report.service");
const response = require("@/utils/controllerResponse");

function resolveShopId(req) {
  return req.shop?._id || req.user?.shopId || null;
}

exports.getShopSummary = async (req, res) => {
  const shopId = resolveShopId(req);

  const data = await reportService.shopSummary(shopId);

  return response.updated(res, req, data);
};

exports.getAdminKPI = async (req, res) => {
  const data = await reportService.adminKPI();

  return response.updated(res, req, data);
};

exports.getSettlementHistory = async (req, res) => {
  const shopId = resolveShopId(req);

  const data = await reportService.settlementHistory(shopId);

  return response.updated(res, req, data);
};
