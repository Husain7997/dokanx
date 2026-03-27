const { runOnce } = require("@/core/infrastructure");
const logger = require("@/core/infrastructure/logger");
const { handlePaymentWebhook } = require("../services/payment.service");

exports.gatewayWebhook = async (req, res) => {
  try {
    const providerPaymentId = req.body.payment_id || req.body.providerPaymentId;
    const webhookEventId = req.body.event_id || req.body.eventId;
    const status = String(req.body.status || "SUCCESS").toUpperCase();

    if (!providerPaymentId) {
      return res.status(400).json({
        received: false,
        message: "providerPaymentId is required",
        requestId: req.requestId || null,
      });
    }

    logger.info({
      event: "PAYMENT_WEBHOOK_RECEIVED",
      providerPaymentId,
      webhookEventId: webhookEventId || null,
      status,
      provider: req.headers["x-payment-provider"] || req.body.provider || null,
    }, "Payment webhook received");

    const result = await runOnce(
      `payment-webhook:${webhookEventId || providerPaymentId}:${status}`,
      async () => handlePaymentWebhook({
        ...req.body,
        providerPaymentId,
        eventId: webhookEventId || null,
        status,
      }),
      {
        scope: "payment",
        route: "payment-webhook",
        requestHash: JSON.stringify({
          providerPaymentId,
          webhookEventId: webhookEventId || null,
          status,
        }),
      }
    );

    return res.json({
      received: true,
      duplicate: Boolean(result?.duplicate),
      requestId: req.requestId || null,
    });
  } catch (err) {
    logger.error({
      event: "PAYMENT_WEBHOOK_FAILED",
      requestId: req.requestId || null,
      providerPaymentId: req.body.payment_id || req.body.providerPaymentId || null,
      webhookEventId: req.body.event_id || req.body.eventId || null,
      status: req.body.status || null,
      message: err?.message || "Unknown payment webhook error",
    }, "Payment webhook processing failed");

    return res.status(err.statusCode || 500).json({
      received: false,
      message: err.message,
      requestId: req.requestId || null,
      retryable: true,
    });
  }
};
