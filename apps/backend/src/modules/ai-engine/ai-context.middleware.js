const { scoreCustomer } = require("./customer-score.service");
const { getExplainableRecommendations } = require("./recommendation.engine");

async function aiContext(req, _res, next) {
  try {
    const userId = req.user?._id || null;
    req.aiContext = {
      recommendations: userId
        ? await getExplainableRecommendations({
            userId,
            location: req.query?.location || null,
            limit: 5,
            shopId: req.traffic?.type === "direct" ? req.traffic?.scopeShopId || null : null,
          })
        : [],
      customerScore: userId ? await scoreCustomer(userId) : null,
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = aiContext;
