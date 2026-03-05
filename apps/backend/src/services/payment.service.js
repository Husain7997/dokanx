const PaymentAttempt =
 require("../models/paymentAttempt.model");

const Order =
 require("../models/order.model");

const {
  runOnce
} = require("@/core/infrastructure");
const {
  executeFinancial
} = require("@/services/financialCommand.service");

async function handlePaymentWebhook(
  payload
) {

  const {
    providerPaymentId,
    status
  } = payload;

  const attempt =
    await PaymentAttempt.findOne({
      providerPaymentId
    });

  if (!attempt)
    throw new Error("Attempt not found");

  if (attempt.status === "SUCCESS")
    return { duplicate: true };

  attempt.status = status;
  await attempt.save();

  if (status !== "SUCCESS")
    return { ok: false };

  const order =
    await Order.findById(attempt.order);

  await runOnce(
    `payment:${attempt._id}`,
    async () => {
      await executeFinancial({
        shopId: order.shopId || order.shop,
        idempotencyKey: `ORDER_PAYMENT_${order._id}_${attempt._id}`,
        amount: attempt.amount,
        reason: "wallet_credit"
      });

    }
  );

  return { ok: true };
}

module.exports = {
  handlePaymentWebhook
};
