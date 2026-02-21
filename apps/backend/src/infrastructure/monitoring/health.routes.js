const router = require("express").Router();
const controller =
require("./health.controller");

router.get("/health", controller.health);

module.exports = router;
