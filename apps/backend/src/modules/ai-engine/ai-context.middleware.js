const { scoreCustomer } = require("./customer-score.service");
const { getExplainableRecommendations } = require("./recommendation.engine");
const { recordSessionActivity, getRealtimeFeatures } = require("./realtime-feature.service");

async function aiContext(req, _res, next) {
  try {
    const userId = req.user?._id || null;
    const sessionId = req.headers["x-session-id"] || req.headers["x-device-id"] || req.ip;
    await recordSessionActivity({
      userId,
      sessionId,
      route: req.originalUrl || req.path || "ai_context",
      shopId: req.traffic?.scopeShopId || req.query?.shopId || req.body?.shopId || null,
    });
    const realtimeFeatures = await getRealtimeFeatures({
      userId,
      sessionId,
      shopId: req.traffic?.scopeShopId || req.query?.shopId || req.body?.shopId || null,
    });
    req.aiContext = {
      recommendations: userId
        ? await getExplainableRecommendations({
            userId,
            location: req.query?.location || null,
            limit: 5,
            shopId: req.traffic?.type === "direct" ? req.traffic?.scopeShopId || null : null,
            sessionId,
          })
        : [],
      customerScore: userId ? await scoreCustomer(userId) : null,
      realtimeFeatures,
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = aiContext;
