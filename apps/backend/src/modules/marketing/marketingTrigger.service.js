const Order = require("@/models/order.model");
const marketingService = require("./marketing.service");

async function safeExecute({ shopId, trigger, context = {}, logger = null }) {
  if (!shopId || !trigger) return [];

  try {
    return await marketingService.executeAutomationTrigger({
      shopId,
      trigger,
      context,
    });
  } catch (err) {
    if (logger?.warn) {
      logger.warn({ err: err.message, trigger, shopId }, "Marketing trigger execution skipped");
    }
    return [];
  }
}

async function triggerWelcomeFlow({ shopId, user, logger = null }) {
  return safeExecute({
    shopId,
    trigger: "WELCOME",
    context: {
      userId: user?._id || null,
      email: user?.email || "",
      customerOrders: 0,
    },
    logger,
  });
}

async function triggerAbandonedCartFlow({ shopId, cart, userId = null, guestToken = null, logger = null }) {
  if (!cart?.items?.length) return [];

  return safeExecute({
    shopId,
    trigger: "ABANDONED_CART",
    context: {
      userId,
      guestToken,
      cartSubtotal: Number(cart?.totals?.subtotal || 0),
      cartQuantity: Number(cart?.totals?.quantity || 0),
      itemCount: Number(cart?.totals?.itemCount || 0),
    },
    logger,
  });
}

async function triggerFirstPurchaseFlow({ order, logger = null }) {
  if (!order?.shopId || !order?.user) return [];

  const totalOrders = await Order.countDocuments({
    shopId: order.shopId,
    user: order.user,
  });

  if (totalOrders !== 1) {
    return [];
  }

  return safeExecute({
    shopId: order.shopId,
    trigger: "FIRST_PURCHASE",
    context: {
      userId: order.user,
      orderId: order._id,
      orderAmount: Number(order.totalAmount || 0),
      customerOrders: totalOrders,
    },
    logger,
  });
}

module.exports = {
  safeExecute,
  triggerWelcomeFlow,
  triggerAbandonedCartFlow,
  triggerFirstPurchaseFlow,
};
