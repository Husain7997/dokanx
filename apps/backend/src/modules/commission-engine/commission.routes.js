const router = require("express").Router();
const controller = require("./commission.controller");
const { protect, allowRoles } = require("../../middlewares");

router.get("/rules", protect, allowRoles("ADMIN"), controller.listRules);
router.post("/rules", protect, allowRoles("ADMIN"), controller.upsertRule);

module.exports = router;
