
// const crypto = require("crypto");
const { addJob } = require("@/core/infrastructure");


const Wallet = require("../models/wallet.model");
const Order = require("../models/order.model");
const Payment = require("../models/payment.model");
const walletService = require("../services/wallet.service");
const Ledger = require("../modules/ledger/ledger.model");
const { verifySignature } = require("../utils/verifySignature");
const PaymentService = require("../services/payment.service");
const { creditWallet } = require("../services/wallet.service");
const mongoose = require("mongoose");
const PaymentAttempt = require("../models/paymentAttempt.model");
const { handlePaymentWebhook } = require("../services/payment.service");
const paymentService = require("../services/payment.service");
const Settlement = require("../models/settlement.model");
const { ensureIdempotent } = require('../utils/idempotency');
const paymentGateway = require("../services/payment/paymentGateway.service");
const { createAudit } = require("../utils/audit.util");
const fraudService = require("../services/fraud.service");
const { t } = require("@/core/infrastructure");
const { resolveShopId } = require("../utils/order-normalization.util");

// const features = require('../config/features');



console.log("✅ payment.controller.js LOADED");

const ALLOWED_PAYMENT_PROVIDERS = new Set(["bkash", "nagad", "stripe"]);
const DEFAULT_PAYMENT_PROVIDER = "bkash";

function canAccessOrder(req, order, options = {}) {
  const role = String(req.user?.role || "").toUpperCase();
  if (["ADMIN", "SUPER_ADMIN", "FINANCE_ADMIN", "SUPPORT_ADMIN", "AUDIT_ADMIN"].includes(role)) {
    return true;
  }
  if (!order) return false;

  const userId = String(req.user?._id || req.user?.id || "");
  const customerId = String(order.customerId || order.user || "");
  const shopId = String(order.shopId || order.shop || "");
  const actorShopId = String(req.user?.shopId || req.shop?._id || "");

  if (options.allowCustomer !== false && role === "CUSTOMER" && userId && customerId === userId) {
    return true;
  }

  if (["OWNER", "STAFF"].includes(role) && actorShopId && shopId === actorShopId) {
    return true;
  }

  return false;
}

/* ================================
   INITIATE PAYMENT
================================ */


exports.initiatePayment = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { provider } = req.body || {};
    const normalizedProvider = String(provider || DEFAULT_PAYMENT_PROVIDER).trim().toLowerCase();

    if (!normalizedProvider) {
      return res.status(400).json({ message: "provider is required" });
    }

    if (!ALLOWED_PAYMENT_PROVIDERS.has(normalizedProvider)) {
      return res.status(400).json({ message: "Invalid payment provider" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (!canAccessOrder(req, order)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const gateway = normalizedProvider;

    const gatewayResult = await paymentGateway.createPayment({
      provider: gateway,
      amount: order.totalAmount,
      currency: "BDT",
      orderId: order._id,
    });

let attempt = await PaymentAttempt.findOne({
  order: order._id,
  status: "PENDING"
});

if (!attempt) {
  attempt = await PaymentAttempt.create({
    order: order._id,
    shopId: resolveShopId(order),
    amount: order.totalAmount,

    provider: gatewayResult.provider,
    gateway: gateway,

    // 🔥 UNIQUE but random
    providerPaymentId: gatewayResult.providerPaymentId,

    status: "PENDING",
    processed: false
  });
} else {
  attempt.provider = gatewayResult.provider;
  attempt.gateway = gateway;
  attempt.providerPaymentId = gatewayResult.providerPaymentId;
  attempt.amount = order.totalAmount;
  await attempt.save();
}

    await createAudit({
      action: "PAYMENT_INITIATED",
      performedBy: req.user?._id || null,
      targetType: "Order",
      targetId: order._id,
      req,
      meta: {
        provider: gatewayResult.provider,
        providerPaymentId: gatewayResult.providerPaymentId,
        amount: Number(order.totalAmount || 0),
        deviceFingerprint: req.headers["x-device-fingerprint"] || null,
      },
    });

    try {
      await fraudService.evaluateTransaction({
        orderId: order._id,
        paymentAttemptId: attempt._id,
        source: "payment_initiated",
        context: {
          ip: req.ip,
          userAgent: req.headers["user-agent"] || "",
          deviceFingerprint: req.headers["x-device-fingerprint"] || "",
        },
      });
    } catch (fraudError) {
      console.warn("Fraud evaluation failed", fraudError?.message || fraudError);
    }


    res.status(201).json({
      message: t('common.updated', req.lang),
      providerPaymentId: gatewayResult.providerPaymentId,
      attemptId: attempt._id,
      paymentUrl: gatewayResult.paymentUrl,
      provider: gatewayResult.provider,
      gateway
    });
  } catch (err) {
    next(err);
  }
};



/* ================================
   PAYMENT WEBHOOK
================================ */



exports.paymentWebhook = async (req, res) => {

  try {

    await ensureIdempotent(
      req.headers["idempotency-key"]
        || req.body.eventId,
      "payment"
    );

    const provider = req.headers["x-payment-provider"] || req.body.provider || "bkash";
    const signature = req.headers["x-payment-signature"] || "";
    const verified = await paymentGateway.verifyWebhook(provider, req.body, signature);
    if (!verified) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const result =
      await paymentService.handlePaymentWebhook(
        req.body
      );
return res.json({
  success: true,
  result
});
 

  } catch (err) {

    console.error(err);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};



/* ================================
   RETRY PAYMENT
================================ */
exports.retryPayment = async (req, res) => {
  try {
    const { orderId } = req.body;


    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!canAccessOrder(req, order)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (order.status === "CONFIRMED") {
      return res
        .status(400)
        .json({ message: "Confirmed order cannot retry payment" });
    }

    const payment = await Payment.findOne({
      order: orderId,
      status: "FAILED",
    }).sort({ createdAt: -1 });

    if (!payment) {
      return res.status(404).json({ message: "No failed payment to retry" });
    }

    payment.status = "PENDING";
    payment.attemptNo += 1;
    await payment.save();

    res.json({
      message: "Payment retry initiated",
      paymentId: payment._id,
      attemptNo: payment.attemptNo,
      amount: payment.amount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Retry failed" });
  }
};

/* ================================
   REFUND (LEDGER BASED)
================================ */
exports.refundPayment = async (req, res) => {

  const { orderId, amount, reason } = req.body;

  const order =
    await Order.findById(orderId);

  if (!order)
    return res.status(404)
      .json({ message: "Order not found" });

  

  order.status = "REFUNDED";
  await order.save();

  await createAudit({
    action: "ORDER_REFUND_APPROVED",
    performedBy: req.user?._id || null,
    targetType: "Order",
    targetId: order._id,
    req,
    meta: {
      orderId,
      amount,
      reason: reason || "",
      status: "REFUNDED",
    },
  });

  try {
    await fraudService.evaluateTransaction({
      orderId: order._id,
      source: "refund_processed",
      context: {
        ip: req.ip,
        userAgent: req.headers["user-agent"] || "",
        deviceFingerprint: req.headers["x-device-fingerprint"] || "",
      },
    });
  } catch (fraudError) {
    console.warn("Fraud evaluation failed", fraudError?.message || fraudError);
  }

  res.json({
    success: true,
    refundedAmount: amount,
  });
};




