const express = require("express");
const router = express.Router();

const { initiatePayment } = require("../controllers/payment.controller");
const { protect } = require("../middlewares");
const { validateBody } = require("../middlewares/validateRequest");
const paymentController = require("../controllers/payment.controller");
const verifySignature = require("../utils/verifySignature");
const paymentValidator = require("../validators/payment.validator");
const {
  gatewayWebhook,
} = require("../controllers/payment.webhook.controller");

router.post(
  "/webhook", verifySignature, gatewayWebhook
);
// express.json({ type: "*/*" }),

router.post(
  "/initiate/:orderId",
  protect,
  validateBody(paymentValidator.validateInitiatePaymentBody),
  initiatePayment
);

router.post("/retry", validateBody(paymentValidator.validateRetryPaymentBody), paymentController.retryPayment);

router.post("/refund", validateBody(paymentValidator.validateRefundPaymentBody), paymentController.refundPayment);



module.exports = router;
