const PaymentAttempt =
 require("../models/paymentAttempt.model");

const Order =
 require("../models/order.model");

const {
  FinancialEngine,
  FinancialTypes,
} =
 require("@/core/financial");

const { runOnce } =
 require("@/core/infrastructure");

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

      await FinancialEngine.execute({
  shopId: order.shop,
  amount: attempt.amount,
  type: "ORDER_PAYMENT",
  referenceId: order._id,
  meta: {
    paymentAttempt: attempt._id
  }
});

    }
  );

  return { ok: true };
}

module.exports = {
  handlePaymentWebhook
};