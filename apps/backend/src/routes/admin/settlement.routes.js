const router = require("express").Router();
const ctrl = require("../../controllers/admin/settlement.controller");
const { protect, allowRoles } = require("../../middlewares");
const { requireSensitiveOtp } = require("../../middlewares/requireSensitiveOtp.middleware");
// const allowRoles = require("../../middlewares/rbac.middleware");

router.use(protect);
router.use(allowRoles("ADMIN"));

router.get("/", ctrl.listSettlements);
router.post(
  "/:settlementId/payout",
  requireSensitiveOtp({
    action: "SETTLEMENT_PAYOUT",
    targetId: (req) => req.params.settlementId,
  }),
  ctrl.triggerManualPayout
);
router.post(
  "/:settlementId/retry",
  requireSensitiveOtp({
    action: "SETTLEMENT_RETRY",
    targetId: (req) => req.params.settlementId,
  }),
  ctrl.retryPayout
);

module.exports = router;
