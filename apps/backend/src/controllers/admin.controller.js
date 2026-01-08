const User = require("../models/user.model");
const Shop = require("../models/shop.model");
const Order = require("../models/order.model");
const Audit = require("../models/audit.model");
const { createAudit } = require("../utils/audit.util");

exports.getAllUsers = async (req, res) => {
  const users = await User.find();
  res.json({ success: true, data: users });
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

  res.json({ success: true, data: user });
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

  res.json({ success: true, data: user });
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
  res.json({ success: true, data: shop });
};

exports.suspendShop = async (req, res) => {
  const shop = await Shop.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  res.json({ success: true, data: shop });
};

exports.getAllOrders = async (req, res) => {
  const orders = await Order.find().populate("user shop");
  res.json({ success: true, data: orders });
};

exports.getAuditLogs = async (req, res) => {
  const logs = await Audit.find().sort({ createdAt: -1 });
  res.json({ success: true, data: logs });
};
