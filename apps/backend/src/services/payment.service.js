const mongoose = require("mongoose");
const PaymentAttempt = require("../models/paymentAttempt.model");
const Order = require("../models/order.model");
const Wallet = require("../models/wallet.model");
const WalletTransaction = require("../models/walletTransaction.model");





exports.handlePaymentWebhook = async (payload) => {
  const { payment_id, status } = payload;

  console.log("🔎 Finding PaymentAttempt by providerPaymentId:", payment_id);

  const attempt = await PaymentAttempt.findOne({
    providerPaymentId: payment_id
  });

  if (!attempt) {
    throw new Error("PaymentAttempt not found");
  }

  // 🛑 Idempotency — only skip if already SUCCESS processed
  if (attempt.processed && attempt.status === "SUCCESS") {
    console.log("⚠️ Already fully processed webhook for:", payment_id);
    return { ok: true, alreadyProcessed: true };
  }

  // Update attempt status first (but NOT processed yet)
  attempt.status = status === "SUCCESS" ? "SUCCESS" : "FAILED";
  await attempt.save();

  if (attempt.status !== "SUCCESS") {
    console.log("❌ Payment failed for:", payment_id);
    return { ok: false, failed: true };
  }

  // 🔥 Now do business logic

  // 1️⃣ Load order
  const order = await Order.findById(attempt.order);

  if (!order) {
    throw new Error("Order not found for payment");
  }

  // 2️⃣ Mark order paid
  order.isCompleted = true;
order.paymentStatus = "SUCCESS";
order.status = "CONFIRMED"; 
await order.save();


  // 3️⃣ Wallet upsert
 let wallet = await Wallet.findOne({
  ownerType: "SHOP",
  ownerId: order.shop
});

if (!wallet) {
  wallet = new Wallet({
    ownerType: "SHOP",
    ownerId: order.shop,
    balance: 0
  });
}

wallet.balance += attempt.amount;
await wallet.save();


  // 5️⃣ Wallet transaction
  await WalletTransaction.create({
  wallet: wallet._id,

  ownerType: "SHOP",
  ownerId: order.shop,

  type: "CREDIT",
  amount: attempt.amount,

  source: "PAYMENT",              
  referenceType: "ORDER",         
  referenceId: order._id,         // 🔥 REQUIRED

  description: "Order payment received",
  balanceAfter: wallet.balance   
});





  // ✅ Finally mark processed ONLY after everything succeeded
  attempt.processed = true;
  await attempt.save();

  console.log("✅ Payment fully processed for:", payment_id);

  return { ok: true };
};

