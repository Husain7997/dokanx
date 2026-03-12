const response = require("@/utils/controllerResponse");
const service = require("./courierOptimization.service");

function resolveShopId(req) {
  return req.shop?._id || req.user?.shopId || null;
}

async function getProfile(req, res, next) {
  try {
    const data = await service.getOptimizationProfile({ shopId: resolveShopId(req) });
    return response.updated(res, req, data || {});
  } catch (err) {
    return next(err);
  }
}

async function upsertProfile(req, res, next) {
  try {
    const data = await service.upsertOptimizationProfile({
      shopId: resolveShopId(req),
      payload: req.body,
    });
    return response.updated(res, req, data);
  } catch (err) {
    return next(err);
  }
}

async function recommend(req, res, next) {
  try {
    const data = await service.recommendProvider({
      shopId: resolveShopId(req),
      providers: Array.isArray(req.body?.providers) ? req.body.providers : [],
    });
    return response.updated(res, req, data);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getProfile,
  upsertProfile,
  recommend,
};
