const User = require("../models/user.model");
const Shop = require("../models/shop.model");
const Order = require("../models/order.model");
const Audit = require("../models/audit.model");
const { createAudit } = require("../utils/audit.util");

exports.getAllUsers = async (req, res) => {
  const users = await User.find();
  res.json({ message: t('common.updated', req.lang), data: users });
};

exports.listMerchants = async (_req, res) => {
  const merchants = await User.find({ role: "OWNER" })
    .populate("shopId", "name domain slug isActive")
    .lean();
  res.json({ data: merchants });
};

exports.listShops = async (_req, res) => {
  const shops = await Shop.find()
    .select("name domain slug isActive owner createdAt commissionRate")
    .populate("owner", "name email")
    .lean();
  res.json({ data: shops });
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
    { new: true }
  );
  if (!shop) return res.status(404).json({ message: "Shop not found" });

  res.json({ message: "Commission rate updated", data: shop });
};

exports.blockUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isBlocked: true },
    { new: true }
  );

  await createAudit({
    performedBy: req.user._id,
    action: "BLOCK_USER",
    targetType: "user",
    targetId: user._id,
    req,
  });

  res.json({ message: t('common.updated', req.lang), data: user });
};

exports.unblockUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isBlocked: false  },
    { new: true }
  );

  await createAudit({
    performedBy: req.user._id,
    action: "BLOCK_USER",
    targetType: "user",
    targetId: user._id,
    req,
  });

  res.json({ message: t('common.updated', req.lang), data: user });
};

exports.approveShop = async (req, res) => {
  const shop = await Shop.findByIdAndUpdate(
    req.params.id,
    { isActive: true },
    { new: true }
  );
  await createAudit({
  admin: req.user._id,
  action: "APPROVE_SHOP",
  targetType: "shop",
  targetId: shop._id,
  req,
});
  res.json({ message: t('common.updated', req.lang), data: shop });
};

exports.suspendShop = async (req, res) => {
  const shop = await Shop.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
   await createAudit({
  performedBy: req.user._id,
  action: "SUSPEND_SHOP",
  targetType: "Shop",
  targetId: shop._id,
  req
});
  res.json({ message: t('common.updated', req.lang), data: shop });
 
};

exports.getAllOrders = async (req, res) => {
  const orders = await Order.find().populate("user shop");
  res.json({ message: t('common.updated', req.lang), data: orders });
};

exports.getAuditLogs = async (req, res) => {
  const logs = await Audit.find()
    .sort({ createdAt: -1 })
    .populate("performedBy", "name email")
    .lean();
  res.json({ message: t('common.updated', req.lang), data: logs });
};
