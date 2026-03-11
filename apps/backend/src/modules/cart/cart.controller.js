const response = require("@/utils/controllerResponse");
const cartService = require("./cart.service");
const { logger } = require("@/core/infrastructure");
const { triggerAbandonedCartFlow } = require("@/modules/marketing/marketingTrigger.service");

function resolveShopId(req) {
  return req.shop?._id || req.user?.shopId || req.body?.shopId || req.query?.shopId || null;
}

function resolveGuestToken(req) {
  return String(
    req.headers["x-cart-token"] ||
    req.query?.guestToken ||
    req.body?.guestToken ||
    ""
  ).trim() || null;
}

exports.getCart = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) {
      return response.failure(res, "Shop context missing", 400);
    }

    const guestToken = req.user ? null : resolveGuestToken(req);
    const cart = await cartService.getCart({
      shopId,
      userId: req.user?._id || null,
      guestToken,
    });

    return res.json({
      success: true,
      data: cart || null,
      guestToken: cart?.guestToken || guestToken,
    });
  } catch (err) {
    return next(err);
  }
};

exports.saveCart = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) {
      return response.failure(res, "Shop context missing", 400);
    }

    const cart = await cartService.saveCart({
      shopId,
      userId: req.user?._id || null,
      guestToken: req.user ? null : resolveGuestToken(req),
      items: Array.isArray(req.body?.items) ? req.body.items : [],
    });

    return res.json({
      success: true,
      data: cart,
      guestToken: cart.guestToken || null,
    });
  } catch (err) {
    return next(err);
  }
};

exports.clearCart = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) {
      return response.failure(res, "Shop context missing", 400);
    }

    const guestToken = req.user ? null : resolveGuestToken(req);
    const existingCart = await cartService.getCart({
      shopId,
      userId: req.user?._id || null,
      guestToken,
    });

    await cartService.clearCart({
      shopId,
      userId: req.user?._id || null,
      guestToken,
    });

    await triggerAbandonedCartFlow({
      shopId,
      cart: existingCart,
      userId: req.user?._id || null,
      guestToken,
      logger,
    });

    return res.json({
      success: true,
      message: "Cart cleared",
    });
  } catch (err) {
    return next(err);
  }
};

exports.mergeCart = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) {
      return response.failure(res, "Shop context missing", 400);
    }
    if (!req.user?._id) {
      return response.failure(res, "Unauthorized", 401);
    }

    const guestToken = resolveGuestToken(req) || String(req.body?.guestToken || "").trim();
    if (!guestToken) {
      return response.failure(res, "guestToken is required", 400);
    }

    const cart = await cartService.mergeGuestCart({
      shopId,
      userId: req.user._id,
      guestToken,
    });

    return res.json({
      success: true,
      data: cart,
    });
  } catch (err) {
    return next(err);
  }
};

exports.applyCoupon = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) {
      return response.failure(res, "Shop context missing", 400);
    }

    const cart = await cartService.applyCouponToCart({
      shopId,
      userId: req.user?._id || null,
      guestToken: req.user ? null : resolveGuestToken(req),
      code: req.body.code,
      shippingFee: req.body.shippingFee || 0,
    });

    return res.json({
      success: true,
      data: cart,
    });
  } catch (err) {
    return next(err);
  }
};

exports.removeCoupon = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) {
      return response.failure(res, "Shop context missing", 400);
    }

    const cart = await cartService.removeCouponFromCart({
      shopId,
      userId: req.user?._id || null,
      guestToken: req.user ? null : resolveGuestToken(req),
    });

    return res.json({
      success: true,
      data: cart,
    });
  } catch (err) {
    return next(err);
  }
};
