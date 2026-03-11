const Shop = require("../models/shop.model");
const User = require("../models/user.model");
const { createAudit } = require("../utils/audit.util");
const { logger } = require("@/core/infrastructure");
const response = require("@/utils/controllerResponse");

exports.createShop = async (req, res) => {
  try {
    if (req.user.shopId) {
      return response.failure(res, "User already owns a shop", 400);
    }

    const shop = await Shop.create({
      name: req.body.name,
      currency: req.body.currency,
      timezone: req.body.timezone,
      locale: req.body.locale,
      owner: req.user._id,
      isActive: true,
      status: "ACTIVE",
    });

    await User.findByIdAndUpdate(req.user._id, { shopId: shop._id });
    req.user.shopId = shop._id;
    await req.user.save();

    await createAudit({
      action: "CREATE_SHOP",
      performedBy: req.user._id,
      targetType: "Shop",
      targetId: shop._id,
      req,
    });

    return response.success(res, {
      shop,
    }, 201);
  } catch (err) {
    logger.error({ err: err.message }, "Create shop failed");
    return response.failure(res, err.message, 500);
  }
};

exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  res.json({
    message: "Order status updated (stub)",
    orderId: id,
    status,
  });
};

exports.getMyShops = async (req, res) => {
  try {
    const shops = await Shop.find({ owner: req.user._id });
    return response.updated(res, req, shops);
  } catch (error) {
    logger.warn({ err: error.message }, "Failed to fetch shops");
    return response.failure(res, "Failed to fetch shops", 500);
  }
};

exports.approveShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return response.notFound(res, "Shop");
    }

    shop.isActive = true;
    shop.status = "ACTIVE";
    await shop.save();

    await createAudit({
      action: "APPROVE_SHOP",
      performedBy: req.user._id,
      targetType: "Shop",
      targetId: shop._id,
      req,
    });

    return response.updated(res, req, shop);
  } catch (error) {
    logger.error({ err: error.message }, "Shop approve failed");
    return response.failure(res, "Shop approve failed", 500);
  }
};

exports.suspendShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return response.notFound(res, "Shop");
    }

    shop.isActive = false;
    shop.status = "SUSPENDED";
    await shop.save();

    await createAudit({
      action: "SUSPEND_SHOP",
      performedBy: req.user._id,
      targetType: "Shop",
      targetId: shop._id,
      req,
    });

    return response.message(res, "Shop suspended", shop);
  } catch (error) {
    logger.error({ err: error.message }, "Shop suspend failed");
    return response.failure(res, "Shop suspend failed", 500);
  }
};

exports.blockCustomer = async (req, res) => {
  try {
    const { shopId, userId } = req.params;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return response.notFound(res, "Shop");
    }

    if (String(shop.owner) !== String(req.user._id)) {
      return response.failure(res, "Not your shop", 403);
    }

    const user = await User.findById(userId);
    if (!user) {
      return response.notFound(res, "User");
    }

    user.isBlocked = true;
    await user.save();

    await createAudit({
      performedBy: req.user._id,
      action: "BLOCK_CUSTOMER",
      targetType: "User",
      targetId: user._id,
      req,
    });

    return response.message(res, "Customer blocked", user);
  } catch (error) {
    logger.error({ err: error.message }, "Block customer failed");
    return response.failure(res, "Customer block failed", 500);
  }
};
