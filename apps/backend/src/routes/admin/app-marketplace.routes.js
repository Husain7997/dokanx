const router = require("express").Router();
const { protect, allowRoles } = require("@/middlewares");
const controller = require("@/controllers/admin/appMarketplace.controller");

router.get(
  "/apps/webhooks/dead-letter",
  protect,
  allowRoles("admin"),
  controller.getWebhookDeadLetters
);

module.exports = router;
