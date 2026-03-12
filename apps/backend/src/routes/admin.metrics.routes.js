const router = require("express").Router();
const controller =
require("../controllers/admin.metrics.controller");
const { protect, allowRoles } = require("../middlewares");

router.get("/metrics", protect, allowRoles("admin"), controller.metrics);
router.get("/metrics/automation", protect, allowRoles("admin"), controller.automationMetrics);
router.get("/metrics/operations", protect, allowRoles("admin"), controller.operationsMetrics);

module.exports = router;
