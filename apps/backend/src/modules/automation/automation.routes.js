const router = require("express").Router();
const { tenantAccess } = require("@/middlewares/accessPolicy.middleware");
const { validateBody, validateQuery } = require("@/middlewares/validateRequest");
const controller = require("./automation.controller");
const validator = require("./automation.validator");

router.post(
  "/rules",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateBody(validator.validateRuleBody),
  controller.createRule
);

router.get(
  "/rules",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  controller.listRules
);

router.post(
  "/execute",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateBody(validator.validateExecuteBody),
  controller.executeTrigger
);

router.get(
  "/logs",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  controller.listLogs
);

router.get(
  "/tasks",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateTaskQuery),
  controller.listTasks
);

router.get(
  "/loyalty-summary",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateLoyaltyQuery),
  controller.getLoyaltySummary
);

router.get(
  "/dashboard",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  controller.getDashboard
);

module.exports = router;
