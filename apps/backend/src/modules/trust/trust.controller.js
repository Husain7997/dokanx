const response = require("@/utils/controllerResponse");
const service = require("./trust.service");

function resolveShopId(req) {
  return req.shop?._id || req.user?.shopId || null;
}

async function createProductReview(req, res, next) {
  try {
    const row = await service.createProductReview({
      shopId: resolveShopId(req),
      customerId: req.user._id,
      payload: req.body,
    });
    return response.success(res, { data: row }, 201);
  } catch (err) {
    return next(err);
  }
}

async function listProductReviews(req, res, next) {
  try {
    const rows = await service.listProductReviews({
      shopId: resolveShopId(req),
      productId: req.params.productId,
      limit: req.query.limit,
    });
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
}

async function createShopReview(req, res, next) {
  try {
    const result = await service.createShopReview({
      shopId: resolveShopId(req),
      customerId: req.user._id,
      payload: req.body,
    });
    return response.success(res, { data: result }, 201);
  } catch (err) {
    return next(err);
  }
}

async function getShopRating(req, res, next) {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);
    const row = await service.getShopRating({ shopId });
    return response.updated(res, req, row);
  } catch (err) {
    return next(err);
  }
}

async function createBuyerClaim(req, res, next) {
  try {
    const row = await service.createBuyerClaim({
      shopId: resolveShopId(req),
      customerId: req.user._id,
      payload: req.body,
    });
    return response.success(res, { data: row }, 201);
  } catch (err) {
    return next(err);
  }
}

async function listBuyerClaims(req, res, next) {
  try {
    const rows = await service.listBuyerClaims({
      shopId: resolveShopId(req),
      status: req.query.status || null,
      limit: req.query.limit,
    });
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createProductReview,
  listProductReviews,
  createShopReview,
  getShopRating,
  createBuyerClaim,
  listBuyerClaims,
};
