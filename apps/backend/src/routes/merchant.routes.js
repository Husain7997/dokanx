const express = require("express");

const authController = require("../modules/auth/auth.controller");
const Shop = require("../models/shop.model");
const { protect, allowRoles } = require("../middlewares");

const router = express.Router();

function getShopLookup(user = {}) {
  const conditions = [];
  if (user.shopId) conditions.push({ _id: user.shopId });
  if (user.id || user._id) conditions.push({ owner: user.id || user._id });
  return conditions.length ? { $or: conditions } : null;
}

router.post("/register", (req, res, next) => {
  req.body = {
    ...req.body,
    referralCode: req.body?.agentId || req.body?.agentCode || req.body?.referralCode,
  };
  return authController.merchantOnboard(req, res, next);
});

router.get("/kyc/status", protect, allowRoles("OWNER", "STAFF", "ADMIN"), async (req, res, next) => {
  try {
    const lookup = getShopLookup(req.user);
    if (!lookup) return res.status(400).json({ success: false, message: "Shop context required" });
    const shop = await Shop.findOne(lookup).lean();
    if (!shop) return res.status(404).json({ success: false, message: "Shop not found" });
    return res.json({
      success: true,
      data: {
        status: shop.status || "DRAFT",
        kycStatus: shop.kycStatus || "DRAFT",
        submittedAt: shop.kycSubmittedAt || null,
        verifiedAt: shop.kycApprovedAt || null,
        rejectionReason: shop.kycRejectionReason || null,
        paymentEnabled: ["VERIFIED", "APPROVED"].includes(String(shop.kycStatus || "").toUpperCase()) || String(shop.status || "").toUpperCase() === "ACTIVE",
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/kyc/submit", protect, allowRoles("OWNER", "STAFF", "ADMIN"), async (req, res, next) => {
  try {
    const lookup = getShopLookup(req.user);
    if (!lookup) return res.status(400).json({ success: false, message: "Shop context required" });
    const shop = await Shop.findOne(lookup);
    if (!shop) return res.status(404).json({ success: false, message: "Shop not found" });

    shop.kycStatus = "SUBMITTED";
    shop.status = "SUBMITTED";
    shop.kycSubmittedAt = new Date();
    shop.kycProfilePhotoUrl = req.body?.profilePhotoUrl || shop.kycProfilePhotoUrl;
    shop.kycNationalIdNumber = req.body?.nationalIdNumber || shop.kycNationalIdNumber;
    shop.kycNationalIdFrontUrl = req.body?.nationalIdFrontUrl || shop.kycNationalIdFrontUrl;
    shop.kycNationalIdBackUrl = req.body?.nationalIdBackUrl || shop.kycNationalIdBackUrl;
    shop.kycTradeLicenseNumber = req.body?.tradeLicenseNumber || shop.kycTradeLicenseNumber;
    shop.kycTradeLicenseUrl = req.body?.tradeLicenseUrl || shop.kycTradeLicenseUrl;
    await shop.save();

    return res.json({
      success: true,
      message: "KYC submitted for review.",
      data: { status: shop.status, kycStatus: shop.kycStatus, paymentEnabled: false },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:shopId/kyc/verify", protect, allowRoles("ADMIN", "SUPER_ADMIN"), async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.shopId);
    if (!shop) return res.status(404).json({ success: false, message: "Shop not found" });
    shop.kycStatus = "VERIFIED";
    shop.status = "ACTIVE";
    shop.isActive = true;
    shop.kycApprovedAt = new Date();
    shop.kycRejectedAt = null;
    shop.kycRejectionReason = null;
    await shop.save();
    return res.json({
      success: true,
      message: "Merchant KYC verified and shop activated.",
      data: { status: shop.status, kycStatus: shop.kycStatus, paymentEnabled: true },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:shopId/kyc/reject", protect, allowRoles("ADMIN", "SUPER_ADMIN"), async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.shopId);
    if (!shop) return res.status(404).json({ success: false, message: "Shop not found" });
    shop.kycStatus = "REJECTED";
    shop.status = "DRAFT";
    shop.isActive = false;
    shop.kycRejectedAt = new Date();
    shop.kycRejectionReason = String(req.body?.reason || "KYC rejected").slice(0, 500);
    await shop.save();
    return res.json({
      success: true,
      message: "Merchant KYC rejected.",
      data: { status: shop.status, kycStatus: shop.kycStatus, paymentEnabled: false },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
