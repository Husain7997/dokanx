const router = require("express").Router();
const controller = require("./traffic.controller");

router.get("/context", controller.getTrafficContext);

module.exports = router;
