const Wallet = require("../models/wallet.model");
const Ledger = require("../models/ledger.model");

exports.credit = async ({
  shopId,
  amount,
  orderId,
  paymentId,
  source,
}) => {
  if (!shopId) {
    throw new Error("shopId is required for wallet credit");
  }

  // 🔒 Idempotency check
  const exists = await Ledger.findOne({
    referenceType: "ORDER",
    referenceId: orderId,
    source,
  });

  if (exists) {
    return { duplicate: true };
  }

  // 🔥 Load wallet
  let wallet = await Wallet.findOne({
  ownerType: "SHOP",
  ownerId: shopId
});

if (!wallet) {
  wallet = await Wallet.create({
    ownerType: "SHOP",
    ownerId: shopId,
    balance: 0
  });
}

wallet.balance += paymentAttempt.amount;



  // 🔥 Ledger entry (SOURCE OF TRUTH)
  await Ledger.create({
    shopId,
    type: "CREDIT",
    amount,

    source,                // "PAYMENT"
    referenceType: "ORDER",
    referenceId: orderId,

    balanceBefore: wallet.balance,
    balanceAfter: newBalance,   // ✅ REQUIRED
  });

  // 🔁 Update wallet snapshot
  wallet.balance = newBalance;
  await wallet.save();

  return { ok: true };
};


exports.debit = async ({
  shopId,
  amount,
  orderId,
  source = "SETTLEMENT",
}) => {
  return await Ledger.create({
    shopId,
    orderId,
    type: "DEBIT",
    amount,
    source,
  });
};

exports.recalculateBalance = async (shopId) => {
  const result = await Ledger.aggregate([
    { $match: { shopId } },
    {
      $group: {
        _id: "$shopId",
        balance: {
          $sum: {
            $cond: [
              { $eq: ["$type", "CREDIT"] },
              "$amount",
              { $multiply: ["$amount", -1] }
            ]
          }
        }
      }
    }
  ]);

  const balance = result[0]?.balance || 0;

  await Wallet.updateOne(
    { shopId },
    { $set: { balance } },
    { upsert: true }
  );

  return balance;
};
