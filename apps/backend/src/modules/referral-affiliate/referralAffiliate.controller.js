const response = require("@/utils/controllerResponse");
const service = require("./referralAffiliate.service");

function resolveShopId(req) {
  return req.shop?._id || req.user?.shopId || null;
}

async function createReferral(req, res, next) {
  try {
    const row = await service.createReferral({
      shopId: resolveShopId(req),
      referrerUserId: req.user._id,
      payload: req.body,
    });
    return response.success(res, { data: row }, 201);
  } catch (err) {
    return next(err);
  }
}

async function redeemReferral(req, res, next) {
  try {
    const row = await service.redeemReferral({
      shopId: resolveShopId(req),
      userId: req.user._id,
      code: req.body.code,
    });
    return response.updated(res, req, row);
  } catch (err) {
    return next(err);
  }
}

async function listReferrals(req, res, next) {
  try {
    const rows = await service.listReferrals({
      shopId: resolveShopId(req),
      status: req.query.status || null,
      limit: req.query.limit,
    });
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
}

async function createAffiliateCommission(req, res, next) {
  try {
    const row = await service.createAffiliateCommission({
      shopId: resolveShopId(req),
      payload: req.body,
    });
    return response.success(res, { data: row }, 201);
  } catch (err) {
    return next(err);
  }
}

async function listAffiliateCommissions(req, res, next) {
  try {
    const rows = await service.listAffiliateCommissions({
      shopId: resolveShopId(req),
      affiliateUserId: req.query.affiliateUserId || null,
      limit: req.query.limit,
    });
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createReferral,
  redeemReferral,
  listReferrals,
  createAffiliateCommission,
  listAffiliateCommissions,
};
