const router = require("express").Router();
const { tenantAccess } = require("@/middlewares/accessPolicy.middleware");
const { validateBody, validateParams, validateQuery } = require("@/middlewares/validateRequest");
const controller = require("./marketing.controller");
const validator = require("./marketing.validator");

router.post(
  "/coupons",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateBody(validator.validateCouponBody),
  controller.createCoupon
);

router.get(
  "/coupons",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateCouponQuery),
  controller.listCoupons
);

router.put(
  "/coupons/:code",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateCouponCodeParam),
  validateBody(validator.validateCouponBody),
  controller.updateCoupon
);

router.get(
  "/coupons/:code/evaluate",
  ...tenantAccess("OWNER", "ADMIN", "STAFF", "CUSTOMER"),
  validateParams(validator.validateCouponCodeParam),
  controller.evaluateCoupon
);

router.post(
  "/automation-rules",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateBody(validator.validateAutomationBody),
  controller.createAutomationRule
);

router.get(
  "/automation-rules",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateAutomationQuery),
  controller.listAutomationRules
);

router.put(
  "/automation-rules/:ruleId",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateAutomationIdParam),
  validateBody(validator.validateAutomationBody),
  controller.updateAutomationRule
);

router.get(
  "/automation-rules/:ruleId/preview",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateAutomationIdParam),
  controller.getAutomationPreview
);

router.post(
  "/automation/execute",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateBody(validator.validateExecutionBody),
  controller.executeAutomationTrigger
);

router.get(
  "/automation/executions",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  controller.listAutomationExecutions
);

module.exports = router;
