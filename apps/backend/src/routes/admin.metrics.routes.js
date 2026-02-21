const router = require("express").Router();
const controller =
require("../controllers/admin.metrics.controller");

router.get("/metrics", controller.metrics);

module.exports = router;
