const Shop = require("../models/shop.model");

function isVerifiedShop(shop) {
  const status = String(shop?.status || "").toUpperCase();
  const kycStatus = String(shop?.kycStatus || "").toUpperCase();
  return status === "ACTIVE" || status === "VERIFIED" || kycStatus === "VERIFIED" || kycStatus === "APPROVED";
}

async function resolveShop(req) {
  if (req.shop?._id) return req.shop;
  const shopId = req.user?.shopId || req.body?.shopId || req.params?.shopId;
  if (shopId) return Shop.findById(shopId);
  if (req.user?.id || req.user?._id) {
    return Shop.findOne({ owner: req.user.id || req.user._id });
  }
  return null;
}

async function requireMerchantKyc(req, res, next) {
  try {
    const shop = await resolveShop(req);
    if (!shop) {
      return res.status(400).json({ success: false, message: "Shop context required for this action." });
    }
    if (!isVerifiedShop(shop)) {
      return res.status(403).json({
        success: false,
        message: "KYC verification required before payments or withdrawals.",
        data: {
          status: shop.status || "DRAFT",
          kycStatus: shop.kycStatus || "DRAFT",
          blockedActions: ["PAYMENT", "WITHDRAWAL"],
        },
      });
    }
    req.shop = shop;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { requireMerchantKyc, isVerifiedShop };
