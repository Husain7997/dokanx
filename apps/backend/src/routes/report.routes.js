const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares");
const { getShopReport } = require("../controllers/report.controller");
const controller = require("../controllers/report.controller");

router.get("/shops/me/earnings", protect, getShopReport);

router.get(
  "/shop/:shopId",
  controller.shopSummary
);


// 🔥 সবচেয়ে গুরুত্বপূর্ণ লাইন
module.exports = router;
