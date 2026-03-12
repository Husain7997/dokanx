const mongoose = require("mongoose");
const { addJob, logger, t } = require("@/core/infrastructure");

const Order = require("../models/order.model");
const Payment = require("../models/payment.model");
const PaymentAttempt = require("../models/paymentAttempt.model");
const paymentService = require("../services/payment.service");
const { ensureIdempotent } = require("../utils/idempotency");
const { resolveBillingSnapshot } = require("../modules/billing/billingExecution.service");
const paymentGateway = require("../infrastructure/payment/paymentGateway.service");

function resolveGateway(paymentMethod) {
  const normalized = String(paymentMethod || "").trim().toUpperCase();

  if (normalized === "BKASH") {
    return {
      gateway: "bkash",
      provider: "bKash",
      handoff: "REDIRECT",
    };
  }

  if (["STRIPE", "CARD", "VISA", "MASTERCARD"].includes(normalized)) {
    return {
      gateway: "stripe",
      provider: "Stripe",
      handoff: "HOSTED_CHECKOUT",
    };
  }

  return {
    gateway: "ssl",
    provider: "SSLCommerz",
    handoff: "REDIRECT",
  };
}

exports.initiatePayment = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const method = String(req.body?.paymentMethod || "").trim().toUpperCase();
    const gatewayConfig = resolveGateway(method);

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const providerPaymentId = `pay_${order._id}`;
    const orderShopId = order.shopId || order.shop;

    let attempt = await PaymentAttempt.findOne({
      order: order._id,
      status: "PENDING",
    });

    if (!attempt) {
      await addJob("settlement", { orderId: order._id });

      const billingSnapshot = await resolveBillingSnapshot({
        tenantId: orderShopId,
        orderChannel: "ONLINE",
        paymentMethod: String(req.body?.paymentMethod || "UNKNOWN").trim().toUpperCase(),
        amount: order.totalAmount,
        hasOwnGateway: Boolean(req.body?.hasOwnGateway),
      });

      attempt = await PaymentAttempt.create({
        order: order._id,
        shopId: orderShopId,
        amount: order.totalAmount,
        provider: gatewayConfig.provider.toLowerCase(),
        gateway: gatewayConfig.gateway,
        providerPaymentId: `pay_${new mongoose.Types.ObjectId()}`,
        status: "PENDING",
        processed: false,
        billingSnapshot,
      });
    }

    const handoff = await paymentGateway.createPayment(gatewayConfig.gateway, {
      orderId: order._id,
      amount: order.totalAmount,
      attemptId: attempt._id,
      paymentMethod: method,
    });

    return res.status(201).json({
      message: t("common.updated", req.lang),
      providerPaymentId,
      attemptId: attempt._id,
      billing: attempt.billingSnapshot || null,
      gateway: gatewayConfig.gateway,
      provider: gatewayConfig.provider,
      handoffType: gatewayConfig.handoff,
      paymentUrl: handoff.paymentURL,
      sessionId: handoff.sessionId || null,
      transactionId: handoff.txnId || null,
    });
  } catch (err) {
    return next(err);
  }
};

exports.paymentWebhook = async (req, res) => {
  try {
    await ensureIdempotent(
      req.headers["idempotency-key"] || req.body.eventId,
      "payment"
    );

    const result = await paymentService.handlePaymentWebhook(req.body);

    return res.json({
      success: true,
      result,
    });
  } catch (err) {
    logger.warn({ err: err.message }, "Payment webhook request failed");
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

exports.retryPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status === "CONFIRMED") {
      return res.status(400).json({
        message: "Confirmed order cannot retry payment",
      });
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

    return res.json({
      message: "Payment retry initiated",
      paymentId: payment._id,
      attemptNo: payment.attemptNo,
      amount: payment.amount,
    });
  } catch (err) {
    logger.error({ err: err.message }, "Payment retry failed");
    return res.status(500).json({ message: "Retry failed" });
  }
};

exports.refundPayment = async (req, res) => {
  const { orderId, amount } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  order.status = "REFUNDED";
  await order.save();

  return res.json({
    success: true,
    refundedAmount: amount,
  });
};
