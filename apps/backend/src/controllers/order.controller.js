const Order = require("../models/order.model");
const Product = require("../models/product.model");
const { createAudit } = require("../utils/audit.util");
const crypto = require("crypto");
const InventoryService = require("../services/Inventory.service");
const PaymentAttempt = require("../models/paymentAttempt.model");
const {
  createInventoryEntry,
} = require("../services/inventoryLedger.service");

const {
  reserveStock,
  releaseStock,
  deductStock,
} = require("../services/Inventory.service");

/**
 * ORDER STATUS TRANSITION RULES
 */
function canTransition(from, to) {
  const rules = {
    PLACED: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["DELIVERED", "CANCELLED"],
    CANCELLED: [],
    DELIVERED: [],
  };

  return rules[from]?.includes(to);
}

/**
 * PLACE ORDER
 */
exports.placeOrder = async (req, res) => {
  try {
    const shop = req.shop;
    const user = req.user || null;
    const { items, email, phone } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order items required",
      });
    }

    if (!user && !phone && !email) {
      return res.status(400).json({
        success: false,
        message: "Guest orders require phone or email",
      });
    }

    if (user && user.isBlocked) {
      return res.status(403).json({ message: "User blocked" });
    }

    if (!shop.isActive) {
      return res.status(403).json({ message: "Shop suspended" });
    }

    const isGuest = !user;
    const guestId = isGuest ? crypto.randomUUID() : null;

    let orderItems = [];
    let totalAmount = 0;

    for (const item of items) {

      const product = await Product.findOne({
        _id: item.product,
        shop: req.shop._id
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }


      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
      });

      totalAmount += product.price * item.quantity;
    }
    for (const item of req.body.items) {
      const inventory = await InventoryService.getInventoryByProduct({
        shopId: req.shop._id,
        productId: item.product
      });

      if (!inventory) {
        return res.status(400).json({
          message: "Inventory not found for product"
        });
      }

      const availableStock = inventory.stock - inventory.reserved;

      if (item.quantity > availableStock) {
        return res.status(400).json({
          message: "Insufficient stock"
        });
      }

    }

    const order = new Order({
      shop: shop._id,
      user: user ? user._id : null,
      guestId,
      items: orderItems,
      totalAmount,
      status: "PLACED",
    });

for (const item of orderItems) {
  await reserveStock({
    shopId: shop._id,
    productId: item.product,
    quantity: item.quantity,
  });
}

    await order.save();

await PaymentAttempt.create({
  shop: order.shop,
  order: order._id,
  gateway: "MANUAL",

  // ⭐ IMPORTANT
  providerPaymentId: `pay_${order._id}`,

  amount: order.totalAmount,
  status: "PENDING"
});

    await createAudit({
      action: "ORDER_CREATED",
      performedBy: user ? user._id : null,
      targetType: "Order",
      targetId: order._id,
      meta: {
        guest: isGuest,
        email,
        phone,
      },
      req,
    });

    res.status(201).json({
      success: true,
      guest: isGuest,
      data: order,
    });
  } catch (error) {
    console.error("ORDER ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Order failed",
    });
  }
};

/**
 * GET SHOP ORDERS (OWNER / ADMIN)
 */
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ shop: req.shop._id })
      .populate("items.product", "name price")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("GET ORDERS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};

/**
 * GET ALL ORDERS (ADMIN)
 */
exports.getAllOrders = async (req, res) => {
  try {
    const page = Number(req.query.page) || 0;
    const limit = Number(req.query.limit) || 10;

    const orders = await Order.find()
      .skip(page * limit)
      .limit(limit)
      .populate("user shop");

    const total = await Order.countDocuments();

    res.json({
      success: true,
      page,
      limit,
      total,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch all orders" });
  }
};

/**
 * UPDATE ORDER STATUS
 */



exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const nextStatus = status.trim().toUpperCase();

    // ✅ ALWAYS fetch fresh order
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    console.log("UPDATE ORDER CONTROLLER:", {
      orderId,
      from: order.status,
      to: nextStatus
    });
if (order.status === "SHIPPED" && nextStatus === "DELIVERED") {
  await InventoryService.deductStockOnDelivery(order);
}
if (order.status === "DELIVERED" && nextStatus === "REFUNDED") {
  await InventoryService.rollbackStockOnRefund(order);
}
if (nextStatus === "CANCELLED") {
  await releaseStock(order);
}
    order.status = nextStatus;

    await order.save();

    return res.json({
      success: true,
      order
    });
  } catch (err) {
    console.error("ORDER STATUS ERROR:", err.message);
    return res.status(500).json({
      message: "Failed to update order"
    });
  }
};





