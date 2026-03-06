// src/utils/orderStatusRules.js

const { createAudit } = require("@/utils/audit.util");
const { canTransition } = require("@/utils/orderStatus.util");
const Order = require("@/models/order.model");

/**
 * UPDATE ORDER STATUS
 * - Validates transition rules
 * - Enforces shop isolation
 * - Creates audit trail
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      shopId: req.shop._id
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    if (!canTransition(order.status, status)) {
      return res.status(400).json({
        message: `Cannot change status from ${order.status} to ${status}`
      });
    }

    const previousStatus = order.status;

    order.status = status;
    await order.save();

    /* =========================
       AUDIT TRAIL
    ========================= */

    await createAudit({
      action: "ORDER_STATUS_UPDATED",
      performedBy: req.user._id,
      targetType: "Order",
      targetId: order._id,
      meta: {
        from: previousStatus,
        to: status
      },
      req
    });

    return res.json({
      message: "Order status updated",
      data: order
    });

  } catch (err) {
    console.error("ORDER STATUS ERROR:", err);
    return res.status(500).json({
      message: "Failed to update order"
    });
  }
};