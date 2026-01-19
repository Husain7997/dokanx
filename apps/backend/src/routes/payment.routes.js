const express = require("express");
const router = express.Router();

const { initiatePayment } = require("../controllers/payment.controller");
const { protect } = require("../middlewares/auth.middleware");
const paymentController = require("../controllers/payment.controller");
const verifySignature = require("../utils/verifySignature");

router.post(
  "/webhook", verifySignature, paymentController.paymentWebhook
);
// express.json({ type: "*/*" }),

router.post("/initiate/:orderId", protect, initiatePayment);

router.post("/retry", paymentController.retryPayment);

router.post("/refund", paymentController.refundPayment);



module.exports = router;
