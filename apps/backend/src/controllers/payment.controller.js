
// const crypto = require("crypto");

const Wallet = require("../models/wallet.model");
const Order = require("../models/order.model");
const Payment = require("../models/payment.model");
const walletService = require("../services/wallet.service");
const Ledger = require("../models/ledger.model");
const { verifySignature } = require("../utils/verifySignature");
const PaymentService = require("../services/payment.service");
const { creditWallet } = require("../services/wallet.service");
const mongoose = require("mongoose");
const PaymentAttempt = require("../models/paymentAttempt.model");
const { handlePaymentWebhook } = require("../services/payment.service");
const paymentService = require("../services/payment.service");


console.log("✅ payment.controller.js LOADED");

/* ================================
   INITIATE PAYMENT
================================ */


exports.initiatePayment = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const providerPaymentId = `pay_${order._id}`;

let attempt = await PaymentAttempt.findOne({
  order: order._id,
  status: "PENDING"
});

if (!attempt) {
  const providerPaymentId = "pay_" + order._id;
  attempt = await PaymentAttempt.create({
    order: order._id,
    shop: order.shop,
    amount: order.totalAmount,

    provider: "sandbox",
    gateway: "sandbox",

    // 🔥 UNIQUE but random
    providerPaymentId: "pay_" + new mongoose.Types.ObjectId(),

    status: "PENDING",
    processed: false
  });
}


    res.status(201).json({
      success: true,
      providerPaymentId,
      attemptId: attempt._id
    });
  } catch (err) {
    next(err);
  }
};


// exports.initiatePayment = async (req, res) => {
//   const { orderId } = req.params;

//   const order = await Order.findById(orderId);
//   if (!order) {
//     return res.status(404).json({ message: "Order not found" });
//   }

//   if (order.status === "CONFIRMED") {
//     return res.status(400).json({ message: "Order already paid" });
//   }

//   // 🔥 CREATE PAYMENT DOCUMENT (CRITICAL)
//   const payment = await Payment.create({
//     order: order._id,
//     attemptNo: 1,
//     amount: order.totalAmount,
//     status: "PENDING",
//   });

//   // 🔗 Link payment to order
//   order.payments.push(payment._id);
//   order.status = "PAYMENT_PENDING";
//   await order.save();

//   const intent = await PaymentService.createPaymentIntent({
//     order,
//     payment,
//     req,
//   });

//   res.json({
//     success: true,
//     redirectUrl: intent.redirectUrl,
//     paymentId: payment._id,
//   });
// };


/* ================================
   PAYMENT WEBHOOK
================================ */




exports.paymentWebhook = async (req, res, next) => {
  const payload = req.body; // ✅ MUST
  console.log("🔥 Webhook Controller Hit");
  console.log("Payload:", payload);

  try {
   await paymentService.handlePaymentWebhook(req.body);

    return res.json({
      success: true,
      message: "Webhook processed",
    });
  } catch (err) {
    console.error("❌ Webhook error:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};



// exports.webhook = async (req, res) => {
//   try {
//     const payload = req.body;

//     // Only SUCCESS payments
//     if (payload.status !== "SUCCESS") {
//       return res.json({ ok: true });
//     }

//     // 1️⃣ Find payment
//     const payment = await Payment.findOne({
//       gateway: payload.gateway,
//       gatewayTxnId: payload.trx_id
//     });

//     if (!payment) {
//       return res.status(404).json({
//         error: "Payment not found"
//       });
//     }

//     // 2️⃣ Idempotency check
//     if (payment.status === "SUCCESS") {
//       return res.json({
//         ok: true,
//         duplicate: true
//       });
//     }

//     // 3️⃣ Credit wallet
//     await walletService.creditWalletOnPayment({
//       userId: payment.user,
//       shopId: payment.shop,
//       amount: payment.amount,
//       currency: payment.currency,
//       referenceId: payment._id.toString(),
//       meta: payload
//     });

//     // 4️⃣ Update payment
//     payment.status = "SUCCESS";
//     payment.gatewayPayload = payload;
//     await payment.save();

//     return res.json({ ok: true });
//   } catch (error) {
//     console.error("WEBHOOK ERROR:", error);
//     return res.status(500).json({
//       error: "Webhook processing failed"
//     });
//   }
// };


/* ================================
   RETRY PAYMENT
================================ */
exports.retryPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
console.log("🔎 Webhook identifiers:", {
  providerPaymentId: payload.providerPaymentId,
});

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

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
  try {
    const { orderId, amount, reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const lastLedger = await Ledger.findOne({ order: order._id }).sort({
      createdAt: -1,
    });

    const balance = lastLedger?.balanceAfter || 0;
    if (amount > balance) {
      return res.status(400).json({ message: "Insufficient refundable amount" });
    }

    await Ledger.create({
      order: order._id,
      type: "DEBIT",
      source: "REFUND",
      amount,
      reason,
      balanceAfter: balance - amount,
    });

    order.status =
      balance - amount === 0 ? "REFUNDED" : "PARTIALLY_REFUNDED";
    await order.save();

    res.json({
      message: "Refund processed",
      refundedAmount: amount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Refund failed" });
  }
};
