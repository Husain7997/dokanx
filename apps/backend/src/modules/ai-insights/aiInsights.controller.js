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

async function getBusinessTrends(req, res, next) {
  try {
    const data = await service.getBusinessTrends({
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

async function getPricingRecommendations(req, res, next) {
  try {
    const data = await service.getPricingRecommendations({
      shopId: req.shop?._id,
      days: service.toNumber(req.query.days, 14),
      limit: service.toNumber(req.query.limit, 10),
      maxAdjustmentPct: service.toNumber(req.query.maxAdjustmentPct, 15),
    });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function getDemandAwareReorderSuggestions(req, res, next) {
  try {
    const data = await service.getDemandAwareReorderSuggestions({
      shopId: req.shop?._id,
      days: service.toNumber(req.query.days, 14),
      limit: service.toNumber(req.query.limit, 10),
      supplierCandidates: service.toNumber(req.query.supplierCandidates, 3),
    });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function getMarginAwarePricingAdvisory(req, res, next) {
  try {
    const data = await service.getMarginAwarePricingAdvisory({
      shopId: req.shop?._id,
      days: service.toNumber(req.query.days, 28),
      limit: service.toNumber(req.query.limit, 10),
      targetMarginPct: service.toNumber(req.query.targetMarginPct, 18),
      maxAdjustmentPct: service.toNumber(req.query.maxAdjustmentPct, 15),
    });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function getFraudAnomalyAlerts(req, res, next) {
  try {
    const data = await service.getFraudAnomalyAlerts({
      shopId: req.shop?._id,
      days: service.toNumber(req.query.days, 30),
      limit: service.toNumber(req.query.limit, 10),
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
  getBusinessTrends,
  getPricingRecommendations,
  getDemandAwareReorderSuggestions,
  getMarginAwarePricingAdvisory,
  getFraudAnomalyAlerts,
};
