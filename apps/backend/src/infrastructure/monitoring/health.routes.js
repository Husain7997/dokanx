const router = require("express").Router();
const controller =
require("./health.controller");
const {
  readinessCheck,
} = require("./readiness.controller");

router.get("/health", controller.health);
router.get("/readiness", readinessCheck);
router.get("/metrics", controller.metrics);
router.get("/queues/dead-letter", controller.deadLetter);

module.exports = router;
