const service = require("./aiInsights.service");

async function getBusinessInsights(req, res, next) {
  try {
    const data = await service.getBusinessInsights({
      shopId: req.shop?._id,
      days: service.toNumber(req.query.days, 7),
      limit: service.toNumber(req.query.limit, 5),
    });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function getBusinessActions(req, res, next) {
  try {
    const data = await service.getBusinessActions({
      shopId: req.shop?._id,
      days: service.toNumber(req.query.days, 7),
      limit: service.toNumber(req.query.limit, 5),
      maxActions: service.toNumber(req.query.maxActions, 10),
    });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getBusinessInsights,
  getBusinessActions,
};
