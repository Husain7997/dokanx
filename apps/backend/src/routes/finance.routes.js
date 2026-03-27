const express = require("express");
const router = express.Router();
const { protect, allowRoles } = require("../middlewares");
const controller = require("../controllers/merchant.finance.controller");

router.use(protect);
router.use(allowRoles("OWNER", "STAFF", "ADMIN"));

router.get("/me", controller.getMerchantFinanceOverview);
router.post("/me/entries", controller.createMerchantFinanceEntry);

module.exports = router;
