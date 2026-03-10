const router = require("express").Router();
const { protect, allowRoles } = require("@/middlewares");
const { tenantGuard } = require("@/api/middleware/tenantGuard");
const { validateQuery } = require("@/middlewares/validateRequest");
const controller = require("./aiInsights.controller");
const validator = require("./aiInsights.validator");

router.get(
  "/business",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateBusinessInsightsQuery),
  controller.getBusinessInsights
);

router.get(
  "/business/actions",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateBusinessInsightsQuery),
  controller.getBusinessActions
);

router.get(
  "/business/trends",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateBusinessInsightsQuery),
  controller.getBusinessTrends
);

router.get(
  "/pricing/recommendations",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateBusinessInsightsQuery),
  controller.getPricingRecommendations
);

router.get(
  "/pricing/margin-advisory",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateBusinessInsightsQuery),
  controller.getMarginAwarePricingAdvisory
);

router.get(
  "/fraud/anomalies",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateBusinessInsightsQuery),
  controller.getFraudAnomalyAlerts
);

router.get(
  "/reorder/suggestions",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateBusinessInsightsQuery),
  controller.getDemandAwareReorderSuggestions
);

module.exports = router;
