const express = require("express");
const router = express.Router();

const { initiatePayment } = require("../controllers/payment.controller");
const { protect } = require("../middlewares");
const paymentController = require("../controllers/payment.controller");
const paymentGatewayController = require("../controllers/paymentGateway.controller");
const verifySignature = require("../utils/verifySignature");
const {
  gatewayWebhook,
} = require("../controllers/payment.webhook.controller");
const idempotency = require("../core/idempotency/idempotency.middleware");

router.post(
  "/webhook", verifySignature, gatewayWebhook
);
// express.json({ type: "*/*" }),

router.post("/initiate/:orderId", protect, idempotency, initiatePayment);

router.post("/retry", protect, idempotency, paymentController.retryPayment);

router.post("/refund", paymentController.refundPayment);
router.get("/gateways", paymentGatewayController.listGateways);



module.exports = router;
