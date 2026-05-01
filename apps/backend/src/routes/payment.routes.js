const express = require("express");
const router = express.Router();

const { initiatePayment } = require("../controllers/payment.controller");
const { protect, allowRoles, requirePermissions } = require("../middlewares");
const paymentController = require("../controllers/payment.controller");
const paymentGatewayController = require("../controllers/paymentGateway.controller");
const verifySignature = require("../utils/verifySignature");
const {
  gatewayWebhook,
} = require("../controllers/payment.webhook.controller");
const idempotency = require("../core/idempotency/idempotency.middleware");
const { validateRequest } = require("../middlewares/validateRequest.middleware");
const { schemas } = require("../validation/security.schemas");
const { requireSensitiveOtp } = require("../middlewares/requireSensitiveOtp.middleware");

router.post(
  "/webhook", verifySignature, gatewayWebhook
);
// express.json({ type: "*/*" }),

router.post(
  "/initiate/:orderId",
  protect,
  allowRoles("CUSTOMER", "OWNER", "STAFF", "ADMIN"),
  requirePermissions("PAYMENT_INITIATE"),
  validateRequest(schemas.paymentInitiate),
  idempotency,
  initiatePayment
);

router.post(
  "/retry",
  protect,
  allowRoles("CUSTOMER", "OWNER", "STAFF", "ADMIN"),
  requirePermissions("PAYMENT_RETRY"),
  validateRequest(schemas.paymentRetry),
  idempotency,
  paymentController.retryPayment
);

router.post(
  "/refund",
  protect,
  allowRoles("ADMIN", "FINANCE_ADMIN"),
  requirePermissions("PAYMENT_REFUND"),
  validateRequest(schemas.paymentRefund),
  requireSensitiveOtp({
    action: "PAYMENT_REFUND",
    targetId: (req) => req.body?.orderId,
  }),
  paymentController.refundPayment
);
router.get("/gateways", paymentGatewayController.listGateways);



module.exports = router;
