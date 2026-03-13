const {
  publishEvent,
  logger,
} = require("@/core/infrastructure");
const paymentService = require("../services/payment.service");

function normalizePayload(input = {}) {
  return {
    providerPaymentId: input.providerPaymentId || input.payment_id || input.paymentId || "",
    webhookEventId: input.webhookEventId || input.event_id || input.eventId || "",
    orderId: input.orderId || input.order_id || "",
    status: String(input.status || input.payment_status || "SUCCESS").trim().toUpperCase(),
    gateway: String(input.gateway || input.provider || "").trim().toLowerCase(),
  };
}

exports.normalizePayload = normalizePayload;

exports.gatewayWebhook = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    const result = await paymentService.handlePaymentWebhook(payload);

    await publishEvent({
      type: payload.status === "SUCCESS" ? "PAYMENT_SUCCESS" : "PAYMENT_FAILED",
      aggregateId: payload.orderId || result.orderId || payload.providerPaymentId,
      payload: {
        ...req.body,
        normalized: payload,
      },
    });

    res.json({ received: true });
  } catch (err) {
    logger.error({ err: err.message }, "Gateway webhook processing failed");
    res.status(200).json({
      received: true,
    });
  }
};
