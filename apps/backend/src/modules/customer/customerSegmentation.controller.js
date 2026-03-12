const response = require("@/utils/controllerResponse");
const service = require("./customerSegmentation.service");

function resolveShopId(req) {
  return req.shop?._id || req.user?.shopId || null;
}

async function upsertSegment(req, res, next) {
  try {
    const row = await service.upsertSegment({
      shopId: resolveShopId(req),
      payload: req.body,
    });
    return response.updated(res, req, row);
  } catch (err) {
    return next(err);
  }
}

async function listSegments(req, res, next) {
  try {
    const rows = await service.listSegments({
      shopId: resolveShopId(req),
    });
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
}

async function evaluateProfiles(req, res, next) {
  try {
    const data = await service.evaluateCustomerProfiles({
      shopId: resolveShopId(req),
      profiles: Array.isArray(req.body?.profiles) ? req.body.profiles : [],
    });
    return response.updated(res, req, data);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  upsertSegment,
  listSegments,
  evaluateProfiles,
};
