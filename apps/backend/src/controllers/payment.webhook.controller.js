const {
  processSuccessfulPayment,
} = require("../services/paymentProcessor.service");

const {
  publishEvent,
} = require("@/core/infrastructure");

exports.gatewayWebhook = async (req, res) => {
  try {

    const providerPaymentId = req.body.payment_id;
    const webhookEventId = req.body.event_id;
    const orderId = req.body.order_id;

    /* ---------------- DEV BYPASS ---------------- */

    if (process.env.NODE_ENV === "development") {
      console.log("✅ DEV webhook bypass");
    } else {
      // verifySignature(req);
    }

    /* ---------------- PROCESS PAYMENT ---------------- */

    await processSuccessfulPayment({
      providerPaymentId,
      webhookEventId,
    });

    /* ---------------- EVENT ---------------- */

    await publishEvent({
      type: "PAYMENT_SUCCESS",
      aggregateId: orderId,
      payload: req.body,
    });

    res.json({ received: true });

  } catch (err) {

    console.error("WEBHOOK ERROR", err);

    res.status(200).json({
      received: true,
    });
  }
};