const router = require("express").Router();
const controller = require("./delivery.controller");
const { protect, allowRoles } = require("../../middlewares");

router.get("/config", protect, allowRoles("ADMIN"), controller.getConfig);
router.put("/config", protect, allowRoles("ADMIN"), controller.updateConfig);
router.post("/estimate", protect, controller.estimateCharge);
router.get("/groups/:groupId", protect, controller.getGroup);

module.exports = router;
