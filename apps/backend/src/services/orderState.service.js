const mongoose = require("mongoose");
const Order = require("../models/order.model");

const eventBus = require("@/infrastructure/events/eventBus");;
const EVENTS = require("../domain/events");

const {
  canTransition,
} = require("../domain/orderStateMachine");
const { resolveShopId } = require("../utils/order-normalization.util");

function normalizeOrderStatus(status) {
  const normalized = String(status || "").trim().toUpperCase();
  return normalized === "ACCEPTED" ? "CONFIRMED" : normalized;
}

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

    const normalizedNextStatus = normalizeOrderStatus(nextStatus);

    if (
      !canTransition(order.status, normalizedNextStatus)
    ) {
      throw new Error(
        `Illegal transition ${order.status} → ${normalizedNextStatus}`
      );
    }

    order.status = normalizedNextStatus;

    await order.save({ session });

    await session.commitTransaction();

    /**
     * DOMAIN EVENTS ONLY
     */

    if (normalizedNextStatus === "CONFIRMED") {
      eventBus.emit(EVENTS.ORDER_CONFIRMED, {
        orderId: order._id,
        shopId: resolveShopId(order),
        items: order.items,
      });
    }

    if (normalizedNextStatus === "CANCELLED") {
      eventBus.emit(EVENTS.ORDER_CANCELLED, {
        orderId: order._id,
        shopId: resolveShopId(order),
        items: order.items,
      });
    }

    if (normalizedNextStatus === "SHIPPED") {
      eventBus.emit("order.shipped", {
        orderId: order._id,
        shopId: resolveShopId(order),
        items: order.items,
      });
    }

    if (normalizedNextStatus === "DELIVERED") {
      eventBus.emit("order.delivered", {
        orderId: order._id,
        shopId: resolveShopId(order),
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
