const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares/auth.middleware");
const {
  createSettlement,
  payoutSettlement,
} = require("../controllers/settlement.controller");

// Create settlement (admin/internal)
router.post("/", protect, createSettlement);

// Payout a settlement
router.post("/:settlementId/payout", protect, payoutSettlement);

module.exports = router;
