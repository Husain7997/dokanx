const Order = require("../models/order.model");

function normalizeNextStatus(status) {
  const normalized = String(status || "").trim().toUpperCase();
  return normalized === "ACCEPTED" ? "CONFIRMED" : normalized;
}

exports.canUpdateOrderStatus = async (req, res, next) => {
  try {
    const user = req.user;
    const role = String(user?.role || "").toLowerCase();
    const orderId = req.params.orderId;
    const { status } = req.body || {};

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const requestedStatus = String(status || "").trim().toUpperCase();
    const nextStatus = normalizeNextStatus(status);
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const transitions = {
      PLACED: ["PAYMENT_PENDING", "CANCELLED"],
      PAYMENT_PENDING: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["SHIPPED", "CANCELLED"],
      SHIPPED: ["DELIVERED"],
      DELIVERED: ["REFUNDED"],
      PAYMENT_FAILED: ["CANCELLED"],
      CANCELLED: [],
      REFUNDED: [],
    };

    const allowedNext = transitions[String(order.status || "").toUpperCase()] || [];

    if (!allowedNext.includes(nextStatus)) {
      return res.status(400).json({
        message: `Invalid transition from ${order.status} to ${requestedStatus}`,
      });
    }

    if (role === "customer" && nextStatus !== "CANCELLED") {
      return res.status(403).json({ message: "Unauthorized role" });
    }

    req.body.status = requestedStatus;
    return next();
  } catch (err) {
    console.error("ORDER ROLE GUARD ERROR:", err);
    return res.status(500).json({
      message: "Order status update failed",
    });
  }
};
