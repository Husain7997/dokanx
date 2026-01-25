const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares/auth.middleware");
const { getShopReport } = require("../controllers/report.controller");

router.get("/shops/me/earnings", protect, getShopReport);

// 🔥 সবচেয়ে গুরুত্বপূর্ণ লাইন
module.exports = router;
