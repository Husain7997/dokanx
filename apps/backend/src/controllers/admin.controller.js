const User = require("../models/user.model");
const Shop = require("../models/shop.model");
const Order = require("../models/order.model");
const Audit = require("../models/audit.model");
const { createAudit } = require("../utils/audit.util");
const { logger } = require("@/core/infrastructure");
const response = require("@/utils/controllerResponse");

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find();
    response.updated(res, req, users);
  } catch (err) {
    next(err);
  }
};

exports.blockUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: true },
      { returnDocument: "after" }
    );

    if (!user) {
      return response.notFound(res, "User");
    }

    await createAudit({
      performedBy: req.user._id,
      action: "BLOCK_USER",
      targetType: "User",
      targetId: user._id,
      req,
    });

    response.updated(res, req, user);
  } catch (err) {
    next(err);
  }
};

exports.unblockUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: false },
      { returnDocument: "after" }
    );

    if (!user) {
      return response.notFound(res, "User");
    }

    await createAudit({
      performedBy: req.user._id,
      action: "UNBLOCK_USER",
      targetType: "User",
      targetId: user._id,
      req,
    });

    response.updated(res, req, user);
  } catch (err) {
    next(err);
  }
};

exports.approveShop = async (req, res, next) => {
  try {
    const shop = await Shop.findByIdAndUpdate(
      req.params.id,
      {
        isActive: true,
        status: "ACTIVE",
      },
      { returnDocument: "after" }
    );

    if (!shop) {
      return response.notFound(res, "Shop");
    }

    await createAudit({
      performedBy: req.user._id,
      action: "APPROVE_SHOP",
      targetType: "Shop",
      targetId: shop._id,
      req,
    });

    response.updated(res, req, shop);
  } catch (err) {
    next(err);
  }
};

exports.suspendShop = async (req, res, next) => {
  try {
    const shop = await Shop.findByIdAndUpdate(
      req.params.id,
      {
        isActive: false,
        status: "SUSPENDED",
      },
      { returnDocument: "after" }
    );

    if (!shop) {
      return response.notFound(res, "Shop");
    }

    await createAudit({
      performedBy: req.user._id,
      action: "SUSPEND_SHOP",
      targetType: "Shop",
      targetId: shop._id,
      req,
    });

    response.updated(res, req, shop);
  } catch (err) {
    next(err);
  }
};

exports.getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find().populate("user shop");
    response.updated(res, req, orders);
  } catch (err) {
    next(err);
  }
};

exports.getAuditLogs = async (req, res, next) => {
  try {
    const logs = await Audit.find().sort({ createdAt: -1 });
    response.updated(res, req, logs);
  } catch (err) {
    logger.warn({ err: err.message }, "Failed to fetch audit logs");
    next(err);
  }
};
