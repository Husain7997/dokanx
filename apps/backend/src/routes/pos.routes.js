const router = require("express").Router();
const { protect, allowRoles } = require("../middlewares");
const controller = require("../controllers/pos.controller");

router.use(protect);
router.use(allowRoles("OWNER", "STAFF", "ADMIN"));

router.post("/sessions", controller.openSession);
router.post("/sessions/:sessionId/close", controller.closeSession);
router.post("/orders", controller.createPosOrder);

module.exports = router;
