const router = require("express").Router();
const { tenantAccess } = require("@/middlewares/accessPolicy.middleware");
const { validateQuery } = require("@/middlewares/validateRequest");
const controller = require("./aiInsights.controller");
const validator = require("./aiInsights.validator");

router.get(
  "/business",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateBusinessInsightsQuery),
  controller.getBusinessInsights
);

router.get(
  "/business/actions",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateBusinessInsightsQuery),
  controller.getBusinessActions
);

router.get(
  "/business/trends",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateBusinessInsightsQuery),
  controller.getBusinessTrends
);

router.get(
  "/pricing/recommendations",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateBusinessInsightsQuery),
  controller.getPricingRecommendations
);

router.get(
  "/pricing/margin-advisory",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateBusinessInsightsQuery),
  controller.getMarginAwarePricingAdvisory
);

router.get(
  "/fraud/anomalies",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateBusinessInsightsQuery),
  controller.getFraudAnomalyAlerts
);

router.get(
  "/reorder/suggestions",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateBusinessInsightsQuery),
  controller.getDemandAwareReorderSuggestions
);

module.exports = router;
