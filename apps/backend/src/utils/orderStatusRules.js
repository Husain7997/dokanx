
import { canTransition } from "./orderStatus.util.js";
import { createAudit } from"../utils/audit.util.js";

import Order from"../models/order.model.js";

exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      shop: req.shop._id
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!canTransition(order.status, status)) {
      return res.status(400).json({
        message: `Cannot change status from ${order.status} to ${status}`
      });
    }

    order.status = status;
    await order.save();

    await createAudit({
      action: "ORDER_STATUS_UPDATED",
      performedBy: req.user._id,
      targetType: "Order",
      targetId: order._id,
      meta: { from: order.status, to: status },
      req
    });

    res.json({ success: true, data: order });

  } catch (err) {
    console.error("ORDER STATUS ERROR:", err.message);
    res.status(500).json({ message: "Failed to update order" });
  }
};
