const router = require("express").Router();
const ctrl = require("../../controllers/admin/settlement.controller");
const { protect } = require("../../middlewares/auth.middleware");
const allowRoles = require("../../middlewares/rbac.middleware");

router.use(protect);
router.use(allowRoles("ADMIN"));

router.get("/", ctrl.listSettlements);
router.post("/:settlementId/payout", ctrl.triggerManualPayout);
router.post("/:settlementId/retry", ctrl.retryPayout);

module.exports = router;
