const recommendationService = require("../services/recommendation.service");

exports.getHomeRecommendations = async (req, res) => {
  const { location, limit } = req.query;
  const data = await recommendationService.getHomeRecommendations({
    userId: req.user?._id || null,
    location,
    limit,
    trafficType: req.traffic?.type,
    shopId: req.traffic?.scopeShopId || req.query.shopId || null,
  });
  res.json({ data });
};

exports.getProductRecommendations = async (req, res) => {
  const { id } = req.params;
  const { limit } = req.query;
  const data = await recommendationService.getProductRecommendations({
    productId: id,
    userId: req.user?._id || null,
    limit,
    trafficType: req.traffic?.type,
    shopId: req.traffic?.scopeShopId || null,
  });
  res.json({ data });
};

exports.getShopRecommendations = async (req, res) => {
  const { id } = req.params;
  const { location, limit } = req.query;
  const data = await recommendationService.getShopRecommendations({
    shopId: id,
    location,
    limit,
    trafficType: req.traffic?.type,
  });
  res.json({ data });
};

exports.getTrendingRecommendations = async (req, res) => {
  const { window, limit } = req.query;
  const data = await recommendationService.getTrendingRecommendations({
    window,
    limit,
    trafficType: req.traffic?.type,
    shopId: req.traffic?.scopeShopId || null,
  });
  res.json({ data });
};
