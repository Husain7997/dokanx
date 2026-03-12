const {
  transitionOrder,
} = require("../services/orderState.service");
const Order = require("../models/order.model");
const mongoose = require("mongoose");


const CheckoutEngine =
require("@/core/checkout/checkout.engine");
const { publishEvent } = require("@/core/infrastructure");
const {logger} = require("@/core/infrastructure");
const { t } =
  require('@/core/infrastructure');
const { addJob } = require("@/core/infrastructure");
const { triggerFirstPurchaseFlow } = require("@/modules/marketing/marketingTrigger.service");
const cartService = require("@/modules/cart/cart.service");
const marketingService = require("@/modules/marketing/marketing.service");

function resolveShopId(req) {
  return req.shop?._id || req.user?.shopId || req.body?.shopId || req.tenant || null;
}

exports.placeOrder = async (req, res) => {

  const session = await mongoose.startSession();

  try {

    let order;

    await session.withTransaction(async () => {
      const shopId = resolveShopId(req);
      if (!shopId) {
        throw new Error("Shop context missing");
      }
      let subtotal = Number(req.body.totalAmount || 0);
      let discountTotal = 0;
      let finalAmount = subtotal;
      let appliedCoupon = {
        code: "",
        type: "",
        discountValue: 0,
      };

      if (req.body.couponCode) {
        const couponResult = await marketingService.evaluateCoupon({
          shopId,
          code: req.body.couponCode,
          cartSubtotal: subtotal,
          shippingFee: Number(req.body.shippingFee || 0),
          itemCount: Array.isArray(req.body.items)
            ? req.body.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
            : 0,
        });

        if (!couponResult.valid) {
          throw new Error(couponResult.reason || "Coupon invalid");
        }

        discountTotal = Number(couponResult.effect.discountValue || 0);
        finalAmount = Math.max(0, subtotal - discountTotal);
        appliedCoupon = {
          code: couponResult.coupon.code,
          type: couponResult.coupon.type,
          discountValue: discountTotal,
        };
      }

      order = await CheckoutEngine.checkout({
        shopId,
        customerId: req.user?._id || null,
        items: req.body.items,
        totalAmount: finalAmount,
        session
      });
      order.pricing = {
        subtotal,
        discountTotal,
        grandTotal: finalAmount,
      };
      order.appliedCoupon = appliedCoupon;
      await order.save({ session });

      if (req.user?._id) {
        await cartService.clearCart({
          shopId,
          userId: req.user._id,
        });
      }
await addJob("settlement", { orderId: order._id });
      await publishEvent({
        type: "ORDER_CREATED",
        aggregateId: order._id,
        payload: order
      });

    });

    logger.info("Order created", {
      orderId: order._id
    });

    await triggerFirstPurchaseFlow({
      order,
      logger,
    });

    res.status(201).json({
      message: t("order.created", req.lang),
      data: order
    });

  } catch (err) {

    res.status(400).json({
      success: false,
      message: err.message
    });

  } finally {
    session.endSession();
  }
};

/**
 * SHOP ORDERS
 */
exports.getOrders = async (req, res) => {

  const orders = await Order.find({
    shopId: req.shop._id,
  })
    .populate("items.product", "name price")
    .sort({ createdAt: -1 });

  res.json({
    message: t('common.updated', req.lang),
    data: orders,
  });
};

/**
 * ADMIN ALL ORDERS
 */
exports.getAllOrders = async (req, res) => {

  const page = Number(req.query.page) || 0;
  const limit = Number(req.query.limit) || 10;

  const orders = await Order.find()
    .skip(page * limit)
    .limit(limit)
    .populate("user shop");

  const total = await Order.countDocuments();

  res.json({
    message: t('common.updated', req.lang),
    page,
    limit,
    total,
    data: orders,
  });
};

/**
 * STATUS UPDATE
 */
exports.updateOrderStatus = async (req, res) => {

  try {

    const order =
      await transitionOrder({
        orderId: req.params.orderId,
        nextStatus: req.body.status,
      });

    res.json({
      message: t('common.updated', req.lang),
      order,
    });

  } catch (err) {

    res.status(400).json({
      message: err.message,
    });

  }
};
