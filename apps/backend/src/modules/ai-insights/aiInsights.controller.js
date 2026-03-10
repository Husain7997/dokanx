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

module.exports = {
  getBusinessInsights,
};
