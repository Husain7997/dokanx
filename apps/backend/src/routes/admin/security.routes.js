const router = require("express").Router();
const { protect, allowRoles } = require("../../middlewares");
const controller = require("../../controllers/admin/security.controller");

router.use(protect);
router.use(allowRoles("ADMIN"));

router.get("/ip-blocks", controller.listIpBlocks);
router.get("/events", controller.listSecurityEvents);
router.post("/ip-blocks", controller.blockIp);
router.post("/ip-blocks/:id/unblock", controller.unblockIp);

module.exports = router;
