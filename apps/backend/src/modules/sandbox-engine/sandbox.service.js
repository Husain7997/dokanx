const Order = require("../../models/order.model");
const PaymentAttempt = require("../../models/paymentAttempt.model");
const { addJob } = require("../../core/infrastructure");

async function simulatePaymentAttempt({ attemptId, mode = "success" }) {
  const attempt = await PaymentAttempt.findById(attemptId);
  if (!attempt) return null;

  attempt.status = mode === "failed" ? "FAILED" : "SUCCESS";
  attempt.processed = true;
  attempt.processedAt = new Date();
  await attempt.save();

  const order = await Order.findById(attempt.order);
  if (order) {
    order.paymentStatus = attempt.status;
    order.status = attempt.status === "SUCCESS" ? "CONFIRMED" : "PAYMENT_FAILED";
    await order.save();
  }

  return { attempt, order };
}

async function enqueueSandboxLifecycle({ orderId, shopId, simulation = "success" }) {
  const events = simulation === "failed"
    ? ["payment.failed"]
    : ["order.paid", "payment.completed", "order.delivered"];

  for (let index = 0; index < events.length; index += 1) {
    await addJob(
      "sandbox-webhook-simulation",
      {
        event: events[index],
        payload: {
          orderId,
          shopId,
          sandbox: true,
        },
      },
      { delay: index * 1000 }
    );
  }
}

module.exports = {
  simulatePaymentAttempt,
  enqueueSandboxLifecycle,
};
