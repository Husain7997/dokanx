const router = require("express").Router();
const { protect } = require("@/middlewares");
const { tenantAccess } = require("@/middlewares/accessPolicy.middleware");
const { validateBody, validateQuery } = require("@/middlewares/validateRequest");
const controller = require("./appMarketplace.controller");
const validator = require("./appMarketplace.validator");

router.get("/", controller.listApps);

router.post(
  "/developer/profile",
  protect,
  validateBody(validator.validateDeveloperBody),
  controller.ensureDeveloperProfile
);

router.post(
  "/developer/apps",
  protect,
  validateBody(validator.validateAppBody),
  controller.createApp
);

router.get(
  "/installations",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  controller.listInstallations
);

router.post(
  "/:appId/install",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateBody(validator.validateInstallBody),
  controller.installApp
);

router.get(
  "/:appId/webhooks",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  controller.listWebhooks
);

router.post(
  "/:appId/webhooks",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateBody(validator.validateWebhookBody),
  controller.createWebhook
);

router.get(
  "/oauth/authorize",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateAuthorizeQuery),
  controller.authorize
);

router.post(
  "/oauth/token",
  validateBody(validator.validateTokenBody),
  controller.exchangeToken
);

module.exports = router;
