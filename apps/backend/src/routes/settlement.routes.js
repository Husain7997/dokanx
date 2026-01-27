const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares/auth.middleware");
const allowRoles = require("../middlewares/rbac.middleware");
const { createSettlement, payoutSettlement } = require("../controllers/settlement.controller");
const adminCtrl = require("../controllers/admin/settlement.controller");

router.use(protect);
router.use(allowRoles("ADMIN"));

router.post("/", createSettlement);
router.post("/process", adminCtrl.processSettlement);
router.post("/:settlementId/payout", payoutSettlement);

module.exports = router;
