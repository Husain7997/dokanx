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

module.exports = router;
