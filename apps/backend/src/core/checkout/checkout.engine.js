const Order = require("@/models/order.model");
const PaymentAttempt = require("@/models/paymentAttempt.model");
const inventory = require("@/inventory");

const { lockManager } = require("@/core/infrastructure");
const { eventBus } = require("@/core/infrastructure");

/**
 * CENTRAL CHECKOUT ORCHESTRATOR
 */
async function checkout({
  shopId,
  customerId,
  items,
  totalAmount
}) {
  const lockKey = `checkout:${customerId}`;

  const acquired = await lockManager.acquire(lockKey);
  if (!acquired) {
    throw new Error("Checkout already in progress");
  }

  try {
    /* ======================
       1️⃣ CREATE ORDER
    ====================== */

    const order = await Order.create({
      shopId,
      user: customerId || null,
      items,
      totalAmount,
      status: "PLACED",
      paymentStatus: "PENDING"
    });

    /* ======================
       2️⃣ RESERVE INVENTORY
    ====================== */

    for (const item of items) {
      await inventory.createInventoryEntry({
        shopId,
        productId: item.product,
        quantity: item.quantity,
        type: "ORDER_RESERVE",
        direction: "OUT",
        referenceId: order._id
      });
    }

    /* ======================
       3️⃣ PAYMENT ATTEMPT
    ====================== */

    const attempt = await PaymentAttempt.create({
      order: order._id,
      shopId,
      amount: totalAmount,
      provider: "sandbox",
      gateway: "sandbox",
      providerPaymentId: "pay_" + order._id,
      status: "PENDING",
      processed: false
    });

    /* ======================
       4️⃣ EVENT
    ====================== */

    eventBus.emit("ORDER_CREATED", {
      orderId: order._id,
      shopId,
      amount: totalAmount
    });

    order.paymentAttemptId = attempt._id;
    return order;
  } finally {
    await lockManager.release(lockKey);
  }
}

module.exports = { checkout };
