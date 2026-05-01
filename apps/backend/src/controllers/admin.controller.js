const User = require("../models/user.model");
const Shop = require("../models/shop.model");
const Order = require("../models/order.model");
const Audit = require("../models/audit.model");
const { createAudit } = require("../utils/audit.util");
const { t } = require("@/core/infrastructure");
const { listMarketplaceThemeEntries } = require("../utils/theme-marketplace.util");
const {
  createReadQuery,
  createReadOneQuery,
} = require("../infrastructure/database/mongo.client");

exports.getAllUsers = async (req, res) => {
  const users = await createReadQuery(User, {}).lean();
  res.json({ message: t('common.updated', req.lang), data: users });
};

exports.listMerchants = async (_req, res) => {
  const merchants = await createReadQuery(User, { role: "OWNER" })
    .populate("shopId", "name domain slug isActive")
    .lean();
  res.json({ data: merchants });
};

exports.listShops = async (_req, res) => {
  const shops = await createReadQuery(Shop, {})
    .select("name domain slug isActive owner createdAt commissionRate")
    .populate("owner", "name email")
    .lean();
  res.json({ data: shops });
};

exports.listMarketplaceThemes = async (_req, res) => {
  const themes = await listMarketplaceThemeEntries();
  res.json({ data: themes });
};

exports.reviewMarketplaceTheme = async (req, res) => {
  const shopId = String(req.params?.shopId || "");
  const themeId = String(req.params?.themeId || "");
  const status = String(req.body?.approvalStatus || "").toUpperCase();
  const marketplaceStatus = String(req.body?.marketplaceStatus || "").toUpperCase();
  const rejectionReason = String(req.body?.rejectionReason || "").trim();
  const marketplaceFeatured = req.body?.marketplaceFeatured === true;

  if (!shopId || !themeId) {
    return res.status(400).json({ message: "shopId and themeId are required" });
  }

  if (!["APPROVED", "REJECTED"].includes(status)) {
    return res.status(400).json({ message: "approvalStatus must be APPROVED or REJECTED" });
  }

  const shop = await Shop.findById(shopId);
  if (!shop) {
    return res.status(404).json({ message: "Shop not found" });
  }

  const themes = Array.isArray(shop.customThemes) ? [...shop.customThemes] : [];
  const index = themes.findIndex((theme) => String(theme.themeId) === themeId);
  if (index < 0) {
    return res.status(404).json({ message: "Custom theme not found" });
  }

  const existingTheme = themes[index];
  themes[index] = {
    ...existingTheme,
    approvalStatus: status,
    approvedAt: status === "APPROVED" ? new Date() : null,
    rejectedAt: status === "REJECTED" ? new Date() : null,
    rejectionReason: status === "REJECTED" ? rejectionReason : "",
    reviewedByName: req.user?.name || req.user?.email || "Admin",
    marketplaceStatus: status === "APPROVED" && ["LISTED", "PRIVATE"].includes(marketplaceStatus) ? marketplaceStatus : "PRIVATE",
    marketplaceFeatured: status === "APPROVED" ? marketplaceFeatured : false,
    updatedAt: new Date(),
  };

  shop.customThemes = themes;
  await shop.save();

  await createAudit({
    performedBy: req.user._id,
    action: status === "APPROVED" ? "APPROVE_MARKETPLACE_THEME" : "REJECT_MARKETPLACE_THEME",
    targetType: "shop-theme",
    targetId: `${shopId}:${themeId}`,
    req,
    meta: {
      shopId,
      themeId,
      approvalStatus: status,
      marketplaceStatus: themes[index].marketplaceStatus,
      marketplaceFeatured: themes[index].marketplaceFeatured,
      rejectionReason: themes[index].rejectionReason || null,
    },
  });

  res.json({
    message: status === "APPROVED" ? "Theme approved" : "Theme rejected",
    data: themes[index],
  });
};

exports.updateShopCommission = async (req, res) => {
  const { shopId } = req.params;
  const { commissionRate } = req.body || {};
  if (!shopId) return res.status(400).json({ message: "shopId required" });
  const value = Number(commissionRate);
  if (!Number.isFinite(value)) return res.status(400).json({ message: "commissionRate required" });

  const shop = await Shop.findByIdAndUpdate(
    shopId,
    { commissionRate: value },
    { returnDocument: "after" }
  );
  if (!shop) return res.status(404).json({ message: "Shop not found" });

  res.json({ message: "Commission rate updated", data: shop });
};

exports.blockUser = async (req, res) => {
  const reason = String(req.body?.reason || "").trim();
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isBlocked: true },
    { returnDocument: "after" }
  );

  await createAudit({
    performedBy: req.user._id,
    action: "BLOCK_USER",
    targetType: "user",
    targetId: user._id,
    req,
    meta: {
      reason: reason || null,
    },
  });

  res.json({ message: t('common.updated', req.lang), data: user });
};

exports.unblockUser = async (req, res) => {
  const reason = String(req.body?.reason || "").trim();
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isBlocked: false  },
    { returnDocument: "after" }
  );

  await createAudit({
    performedBy: req.user._id,
    action: "UNBLOCK_USER",
    targetType: "user",
    targetId: user._id,
    req,
    meta: {
      reason: reason || null,
    },
  });

  res.json({ message: t('common.updated', req.lang), data: user });
};

exports.updateUser = async (req, res) => {
  const { role, permissionOverrides } = req.body || {};
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const before = {
    role: String(user.role || "CUSTOMER"),
    permissionOverrides: Array.isArray(user.permissionOverrides)
      ? user.permissionOverrides.map((item) => String(item).toUpperCase())
      : [],
  };

  if (role) {
    user.role = String(role).toUpperCase();
  }

  if (Array.isArray(permissionOverrides)) {
    user.permissionOverrides = permissionOverrides;
  }

  await user.save();

  await createAudit({
    performedBy: req.user._id,
    action: "UPDATE_USER_PERMISSIONS",
    targetType: "user",
    targetId: user._id,
    req,
    meta: {
      before,
      after: {
        role: String(user.role || "CUSTOMER"),
        permissionOverrides: Array.isArray(user.permissionOverrides)
          ? user.permissionOverrides.map((item) => String(item).toUpperCase())
          : [],
      },
    },
  });

  res.json({ message: t('common.updated', req.lang), data: user });
};

exports.approveShop = async (req, res) => {
  const reason = String(req.body?.reason || "").trim();
  const shop = await Shop.findByIdAndUpdate(
    req.params.id,
    { isActive: true },
    { returnDocument: "after" }
  );
  await createAudit({
    performedBy: req.user._id,
    action: "APPROVE_SHOP",
    targetType: "shop",
    targetId: shop._id,
    req,
    meta: {
      reason: reason || null,
    },
  });
  res.json({ message: t('common.updated', req.lang), data: shop });
};

exports.suspendShop = async (req, res) => {
  const reason = String(req.body?.reason || "").trim();
  const shop = await Shop.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { returnDocument: "after" }
  );
  await createAudit({
    performedBy: req.user._id,
    action: "SUSPEND_SHOP",
    targetType: "shop",
    targetId: shop._id,
    req,
    meta: {
      reason: reason || null,
    },
  });
  res.json({ message: t('common.updated', req.lang), data: shop });
 
};

exports.getAllOrders = async (req, res) => {
  const orders = await createReadQuery(Order, {}).populate("user shop").lean();
  res.json({ message: t('common.updated', req.lang), data: orders });
};

exports.getAuditLogs = async (req, res) => {
  const logs = await createReadQuery(Audit, {})
    .sort({ createdAt: -1 })
    .populate("performedBy", "name email")
    .lean();
  res.json({ message: t('common.updated', req.lang), data: logs });
};

