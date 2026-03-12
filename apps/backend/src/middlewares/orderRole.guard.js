const Order = require("../models/order.model");
const { logger } = require("@/core/infrastructure");
const {
  getAllowedOrderTransitions,
  normalizeOrderStatus,
} = require("../domain/orderStatus");

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

    const nextStatus = normalizeOrderStatus(status);
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const currentStatus = normalizeOrderStatus(order.status);
    const allowedNext = getAllowedOrderTransitions(currentStatus);

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
