const response = require("@/utils/controllerResponse");
const service = require("./analyticsWarehouse.service");

function resolveShopId(req) {
  return req.shop?._id || req.user?.shopId || null;
}

async function buildSnapshots(req, res, next) {
  try {
    const rows = await service.buildWarehouseSnapshots({
      shopId: resolveShopId(req),
      input: req.body || {},
    });
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
}

async function listSnapshots(req, res, next) {
  try {
    const rows = await service.listWarehouseSnapshots({
      shopId: resolveShopId(req),
      metricType: req.query.metricType || null,
    });
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  buildSnapshots,
  listSnapshots,
};
