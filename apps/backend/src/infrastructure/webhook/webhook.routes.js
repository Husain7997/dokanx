const router = require("express").Router();
const controller = require("./webhook.controller");

router.post("/payment", controller.handle);

module.exports = router;
