const express = require("express");
const router = express.Router();

const { protect, allowRoles } = require("../middlewares");
const { validateBody, validateParams } = require("../middlewares/validateRequest");
// const allowRoles = require("../middlewares/rbac.middleware");
const { createSettlement, payoutSettlement } = require("../controllers/settlement.controller");
const adminCtrl = require("../controllers/admin/settlement.controller");
const controller = require("../controllers/settlement.controller");
const planGuard = require("../middlewares/planGuard.middleware");
const legacyValidator = require("../validators/legacyRoutes.validator");

router.use(protect);
router.use(allowRoles("ADMIN"));

router.post("/", validateBody(legacyValidator.validateSettlementCreateBody), createSettlement);
router.post("/process", validateBody(legacyValidator.validateSettlementProcessBody), adminCtrl.processSettlement);
router.post("/:settlementId/payout", validateParams(legacyValidator.validateSettlementIdParam), payoutSettlement);

router.post(
 "/settle",
 planGuard("autoSettlement"),
//  controller.settle
);


module.exports = router;
