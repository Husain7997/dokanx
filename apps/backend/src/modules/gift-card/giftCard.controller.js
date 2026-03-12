const response = require("@/utils/controllerResponse");
const service = require("./giftCard.service");

function resolveShopId(req) {
  return req.shop?._id || req.user?.shopId || null;
}

async function createGiftCard(req, res, next) {
  try {
    const row = await service.createGiftCard({
      shopId: resolveShopId(req),
      payload: req.body,
    });
    return response.success(res, { data: row }, 201);
  } catch (err) {
    return next(err);
  }
}

async function listGiftCards(req, res, next) {
  try {
    const rows = await service.listGiftCards({
      shopId: resolveShopId(req),
    });
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
}

async function redeemGiftCard(req, res, next) {
  try {
    const row = await service.redeemGiftCard({
      shopId: resolveShopId(req),
      code: req.params.code,
      amount: req.body.amount,
    });
    return response.updated(res, req, row);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createGiftCard,
  listGiftCards,
  redeemGiftCard,
};
