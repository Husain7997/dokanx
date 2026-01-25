const Wallet = require("../models/wallet.model");
const Ledger = require("../models/ledger.model");
const axios = require('axios');
const ShopWallet = require('../models/ShopWallet');
const Settlement = require('../models/settlement.model');

exports.credit = async ({
  shopId,
  amount,
  orderId,
  source,
}) => {
  if (!shopId) throw new Error("shopId is required");

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
    ownerId: shopId,
  });

  if (!wallet) {
    wallet = await Wallet.create({
      ownerType: "SHOP",
      ownerId: shopId,
      balance: 0,
    });
  }

  const balanceBefore = wallet.balance;
  const newBalance = balanceBefore + amount;

  // 🔥 Ledger entry (SOURCE OF TRUTH)
  await Ledger.create({
    shopId,
    type: "CREDIT",
    amount,

    source,                // "PAYMENT"
    referenceType: "ORDER",
    referenceId: orderId,

    balanceBefore,
    balanceAfter: newBalance,
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




async function payoutToShop(settlementId, bankDetails) {
  const settlement = await Settlement.findById(settlementId);
  if (!settlement || settlement.status !== 'PROCESSING') throw new Error('Invalid settlement');

  const wallet = await ShopWallet.findOne({ shop: settlement.shop });
  if (wallet.balance < settlement.totalAmount) throw new Error('Insufficient wallet balance');

  try {
    const response = await axios.post('https://sandbox-bank-api.example.com/payout', {
      account: bankDetails.accountNumber,
      amount: settlement.totalAmount,
      currency: wallet.currency
    });

    if (response.data.status === 'SUCCESS') {
      wallet.balance -= settlement.totalAmount;
      wallet.transactions.push({ type: 'DEBIT', amount: settlement.totalAmount, reference: settlementId, status: 'SUCCESS' });
      await wallet.save();

      settlement.status = 'COMPLETED';
      settlement.payoutId = response.data.payoutId;
      await settlement.save();

      return { success: true, payoutId: response.data.payoutId };
    } else {
      throw new Error('Payout failed');
    }

  } catch (err) {
    settlement.status = 'FAILED';
    await settlement.save();
    throw err;
  }
}

module.exports = { payoutToShop };
