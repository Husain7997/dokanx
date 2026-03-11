const Order = require("../models/order.model");
const { logger } = require("@/core/infrastructure");

const transitions = {
  PLACED: ["PAYMENT_PENDING", "CANCELLED"],
  PAYMENT_PENDING: ["CONFIRMED", "PAYMENT_FAILED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
  REFUNDED: [],
};

function normalizeRole(role = "") {
  return String(role || "").trim().toUpperCase();
}

exports.canUpdateOrderStatus = async (req, res, next) => {
  try {
    const role = normalizeRole(req.user?.role);
    const orderId = req.params.orderId;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const nextStatus = String(status).trim().toUpperCase();
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const currentStatus = String(order.status || "").trim().toUpperCase();
    const allowedNext = transitions[currentStatus] || [];

    if (!allowedNext.includes(nextStatus)) {
      return res.status(400).json({
        message: `Invalid transition from ${currentStatus} to ${nextStatus}`,
      });
    }

    if (role === "CUSTOMER" && nextStatus !== "CANCELLED") {
      return res.status(403).json({ message: "Unauthorized role" });
    }

    return next();
  } catch (err) {
    logger.error({ err: err.message }, "Order status guard failed");
    return res.status(500).json({
      message: "Order status update failed",
    });
  }
};
