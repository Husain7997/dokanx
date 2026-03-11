const {
  processSuccessfulPayment,
} = require("../services/paymentProcessor.service");

const {
  publishEvent,
  logger,
} = require("@/core/infrastructure");

exports.gatewayWebhook = async (req, res) => {
  try {
    const providerPaymentId = req.body.payment_id;
    const webhookEventId = req.body.event_id;
    const orderId = req.body.order_id;

    if (process.env.NODE_ENV !== "development") {
      // verifySignature(req);
    }

    await processSuccessfulPayment({
      providerPaymentId,
      webhookEventId,
    });

    await publishEvent({
      type: "PAYMENT_SUCCESS",
      aggregateId: orderId,
      payload: req.body,
    });

    res.json({ received: true });
  } catch (err) {
    logger.error({ err: err.message }, "Gateway webhook processing failed");
    res.status(200).json({
      received: true,
    });
  }
};
