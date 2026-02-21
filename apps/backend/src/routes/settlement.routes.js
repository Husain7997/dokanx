const express = require("express");
const router = express.Router();

const { protect, allowRoles } = require("../middlewares");
// const allowRoles = require("../middlewares/rbac.middleware");
const { createSettlement, payoutSettlement } = require("../controllers/settlement.controller");
const adminCtrl = require("../controllers/admin/settlement.controller");
const controller = require("../controllers/settlement.controller");
const planGuard = require("../middlewares/planGuard.middleware");

router.use(protect);
router.use(allowRoles("ADMIN"));

router.post("/", createSettlement);
router.post("/process", adminCtrl.processSettlement);
router.post("/:settlementId/payout", payoutSettlement);

router.post(
 "/settle",
 planGuard("autoSettlement"),
//  controller.settle
);


module.exports = router;
