const router = require("express").Router();
const { protect, allowRoles } = require("../middlewares");
const controller = require("../controllers/automation.controller");

router.use(protect);
router.use(allowRoles("OWNER", "ADMIN", "STAFF"));

router.get("/rules", controller.listRules);
router.post("/rules", controller.createRule);

module.exports = router;
