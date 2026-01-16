const Order = require("../models/order.model");

exports.canUpdateOrderStatus = async (req, res, next) => {
  try {
    const user = req.user;
    const role = user?.role;

    console.log("ROLE CHECK:", role);

    const orderId = req.params.orderId;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const nextStatus = status.trim().toUpperCase();

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const currentStatus = order.status;

 const transitions = {
  PLACED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],   // ✅ ADD THIS
  REFUNDED: []
};


    // ✅ FIRST declare
    const allowedNext = transitions[currentStatus] || [];

    // ✅ THEN use
    console.log("ORDER STATUS DEBUG:", {
      current: currentStatus,
      next: nextStatus,
      role,
      allowedNext
    });

    if (!allowedNext.includes(nextStatus)) {
      return res.status(400).json({
        message: `Invalid transition from ${currentStatus} to ${nextStatus}`
      });
    }

    // role-based restriction (future-proof)
    if (role === "customer" && nextStatus !== "CANCELLED") {
      return res.status(403).json({ message: "Unauthorized role" });
    }

    next();
  } catch (err) {
    console.error("ORDER ROLE GUARD ERROR:", err);
    return res.status(500).json({
      message: "Order status update failed"
    });
  }
};
