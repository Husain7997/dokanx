const router = require("express").Router();
const { protect, allowRoles } = require("../../middlewares");
const controller = require("./webhook-engine.controller");

router.get("/admin/webhooks/health", protect, allowRoles("ADMIN"), controller.getHealth);

module.exports = router;
