const mongoose = require("mongoose");
const Order = require("../models/order.model");

const eventBus = require("@/infrastructure/events/eventBus");;
const EVENTS = require("../domain/events");

const {
  canTransition,
} = require("../domain/orderStateMachine");

exports.transitionOrder =
  async ({ orderId, nextStatus }) => {

  const session =
    await mongoose.startSession();

  session.startTransaction();

  try {

    const order =
      await Order.findById(orderId)
        .session(session);

    if (!order)
      throw new Error("Order not found");

    if (
      !canTransition(order.status, nextStatus)
    ) {
      throw new Error(
        `Illegal transition ${order.status} → ${nextStatus}`
      );
    }

    order.status = nextStatus;

    await order.save({ session });

    await session.commitTransaction();

    /**
     * DOMAIN EVENTS ONLY
     */

    if (nextStatus === "CONFIRMED") {
      eventBus.emit(EVENTS.ORDER_CONFIRMED, {
        orderId: order._id,
        shopId: order.shop,
        items: order.items,
      });
    }

    if (nextStatus === "CANCELLED") {
      eventBus.emit(EVENTS.ORDER_CANCELLED, {
        orderId: order._id,
        shopId: order.shop,
        items: order.items,
      });
    }

    return order;

  } catch (err) {

    await session.abortTransaction();
    throw err;

  } finally {
    session.endSession();
  }
};