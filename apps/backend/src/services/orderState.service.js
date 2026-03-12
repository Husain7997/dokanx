const mongoose = require("mongoose");
const Order = require("../models/order.model");

const { eventBus } = require("@/core/infrastructure");
const EVENTS = require("../domain/events");
const { normalizeOrderStatus } = require("../domain/orderStatus");
const { canTransition } = require("../domain/orderStateMachine");

exports.transitionOrder = async ({ orderId, nextStatus }) => {
  const normalizedNextStatus = normalizeOrderStatus(nextStatus);
  const session = await mongoose.startSession();

  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);

    if (!order) {
      throw new Error("Order not found");
    }

    if (!canTransition(order.status, normalizedNextStatus)) {
      throw new Error(`Illegal transition ${order.status} -> ${normalizedNextStatus}`);
    }

    order.status = normalizedNextStatus;
    await order.save({ session });

    await session.commitTransaction();

    const shopId = order.shopId || order.shop;
    const eventPayload = {
      orderId: order._id,
      shopId,
      items: order.items,
    };

    if (normalizedNextStatus === "PENDING") {
      eventBus.emit(EVENTS.ORDER_PENDING, eventPayload);
    }

    if (normalizedNextStatus === "CONFIRMED") {
      eventBus.emit(EVENTS.ORDER_CONFIRMED, eventPayload);
    }

    if (normalizedNextStatus === "PACKED") {
      eventBus.emit(EVENTS.ORDER_PACKED, eventPayload);
    }

    if (normalizedNextStatus === "RETURNED") {
      eventBus.emit(EVENTS.ORDER_RETURNED, eventPayload);
    }

    if (normalizedNextStatus === "CANCELLED") {
      eventBus.emit(EVENTS.ORDER_CANCELLED, eventPayload);
    }

    return order;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
