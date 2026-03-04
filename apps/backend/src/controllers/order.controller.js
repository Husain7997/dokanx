const {
  transitionOrder,
} = require("../services/orderState.service");
const Order = require("../models/order.model");
const mongoose = require("mongoose");


const CheckoutEngine =
require("@/core/checkout/checkout.engine");
const { publishEvent } = require("@/core/infrastructure");
const logger = require("../infrastructure/logger/logger");
const { t } =
  require('@/core/infrastructure');
const { addJob } = require("@/core/infrastructure");
exports.placeOrder = async (req, res) => {

  const session = await mongoose.startSession();

  try {

    let order;

    await session.withTransaction(async () => {

      order = await CheckoutEngine.checkout({
        shopId: req.shop,
        user: req.user,
        items: req.body.items,
        totalAmount: req.body.totalAmount,
        session
      });
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