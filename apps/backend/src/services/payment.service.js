const PaymentAttempt = require("../models/paymentAttempt.model");
const Order = require("../models/order.model");
const Wallet = require("../models/wallet.model");
const Ledger = require("../models/ledger.model");

exports.handlePaymentWebhook = async (payload) => {
  const { providerPaymentId, status } = payload;

  if (!providerPaymentId) {
    throw new Error("providerPaymentId missing in webhook payload");
  }

  // 1️⃣ PaymentAttempt
  const paymentAttempt = await PaymentAttempt.findOne({
    providerPaymentId
  });

  if (!paymentAttempt) {
    throw new Error("PaymentAttempt not found");
  }

  if (paymentAttempt.status === "SUCCESS") {
    console.log("🔁 Duplicate webhook ignored");
    return { ok: true, duplicate: true };
  }

  paymentAttempt.status = status;
  await paymentAttempt.save();

  if (status !== "SUCCESS") {
    return { ok: false };
  }

  // 2️⃣ Order
  const order = await Order.findById(paymentAttempt.order);

  if (!order) {
    throw new Error("Order not found");
  }

  if (!order.shop) {
    throw new Error("Order.shop missing");
  }

  const shopId = order.shop;

  // 3️⃣ Mark order paid
  order.paymentStatus = "SUCCESS";
  order.status = "CONFIRMED";
  await order.save();

  // 4️⃣ Wallet (upsert)
  let wallet = await Wallet.findOne({ shopId });

  if (!wallet) {
    wallet = await Wallet.create({
      shopId,
      balance: 0
    });
  }

  const newBalance = wallet.balance + paymentAttempt.amount;

  // 5️⃣ Ledger (source of truth)
  await Ledger.create({
    shopId,
    type: "CREDIT",
    amount: paymentAttempt.amount,
    source: "ORDER_PAYMENT",
    referenceType: "ORDER",
    referenceId: order._id,
    balanceAfter: newBalance
  });

  // 6️⃣ Update cached wallet balance
  wallet.balance = newBalance;
  await wallet.save();

  console.log("💰 Wallet credited successfully");

  return { ok: true };

  
  async function createSettlement({ order, payment }) {

  const commission = Math.round(order.amount * 0.05);
  const net = order.amount - commission;

  await Settlement.create({
    tenant: order.tenant,
    shop: order.shop,
    order: order._id,
    payment: payment._id,

    gross_amount: order.amount,
    commission_amount: commission,
    net_amount: net,

    mature_at: dayjs().add(7, "day").toDate(),
    idempotency_key: `settlement:${payment._id}`
  });

  // move money to pending_settlement
  await Wallet.updateOne(
    { shop: order.shop },
    {
      $inc: {
        available_balance: -order.amount,
        pending_settlement: order.amount
      }
    }
  );
}

};
