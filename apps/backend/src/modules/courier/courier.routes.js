const router = require("express").Router();
const { tenantAccess } = require("@/middlewares/accessPolicy.middleware");
const { validateBody, validateParams, validateQuery } = require("@/middlewares/validateRequest");
const controller = require("./courier.controller");
const validator = require("./courier.validator");
const optimizationController = require("./courierOptimization.controller");
const optimizationValidator = require("./courierOptimization.validator");

router.post(
  "/shipments",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateBody(validator.validateCreateShipmentBody),
  controller.createShipment
);

router.get(
  "/shipments",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateShipmentQuery),
  controller.listShipments
);

router.get(
  "/shipments/:shipmentId",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateShipmentIdParam),
  controller.getShipment
);

router.get(
  "/shipments/:shipmentId/status",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateShipmentIdParam),
  controller.fetchShipmentStatus
);

router.get(
  "/dashboard",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateShipmentQuery),
  controller.dashboard
);

router.get(
  "/export/shipments",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateShipmentQuery),
  controller.exportShipmentsCSV
);

router.get(
  "/cod-mismatches",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  controller.codMismatches
);

router.post(
  "/webhooks/status",
  validateBody(validator.validateWebhookBody),
  controller.handleWebhook
);

router.post(
  "/shipments/:shipmentId/reconcile-cod",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateShipmentIdParam),
  controller.reconcileCod
);

router.get(
  "/optimization/profile",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  optimizationController.getProfile
);

router.post(
  "/optimization/profile",
  ...tenantAccess("OWNER", "ADMIN"),
  validateBody(optimizationValidator.validateOptimizationProfileBody),
  optimizationController.upsertProfile
);

router.post(
  "/optimization/recommendation",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateBody(optimizationValidator.validateProviderRecommendationBody),
  optimizationController.recommend
);

module.exports = router;
