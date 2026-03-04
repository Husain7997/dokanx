const Order =
  require("@/models/order.model");

const PaymentAttempt =
  require("@/models/paymentAttempt.model");

const inventory = require("@/inventory");

const { withLock } =
  require("@/core/infrastructure/lock.manager");

const { publishEvent } =
  require("@/infrastructure/events/event.dispatcher");

/**
 * CENTRAL CHECKOUT ORCHESTRATOR
 */
async function checkout({
  shopId,
  customerId,
  items,
  totalAmount
}) {

  return withLock(
    `checkout:${customerId}`,
    async () => {

      /* ======================
         1️⃣ CREATE ORDER
      ====================== */

      const order =
        await Order.create({
          shop: shopId,
          customer: customerId,
          items,
          totalAmount,
          status: "PENDING_PAYMENT"
        });

      /* ======================
         2️⃣ RESERVE INVENTORY
      ====================== */

      await inventory.createInventoryEntry({
        shopId,
        orderId: order._id,
        items,
        type: "RESERVATION",
        direction: "OUT"
      });

      /* ======================
         3️⃣ PAYMENT ATTEMPT
      ====================== */

      const attempt =
        await PaymentAttempt.create({
          order: order._id,
          shopId,
          amount: totalAmount,
          provider: "sandbox",
          gateway: "sandbox",
          providerPaymentId:
            "pay_" + order._id,
          status: "PENDING",
          processed: false
        });

      /* ======================
         4️⃣ EVENT
      ====================== */

      await publishEvent(
        "ORDER_CREATED",
        {
          orderId: order._id,
          shopId,
          amount: totalAmount
        }
      );

      return {
        orderId: order._id,
        attemptId: attempt._id
      };

    }
  );
}

module.exports = {
  checkout
};