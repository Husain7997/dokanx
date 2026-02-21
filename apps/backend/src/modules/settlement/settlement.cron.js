const Settlement = require("../../models/settlement.model");
const Wallet = require("../../models/wallet.model");
const PlatformWallet = require("../../models/platformWallet.model");
const Ledger = require("../../models/ledger.model");
const mongoose = require("mongoose");

const cron = require('node-cron');
const Shop = require('../../models/shop.model');
const { settleShopOrders } = require('../../services/settlement.service');
const { isTest } = require('../config/runtime');

if (isTest) {
  return mockResult;
}

/**
 * Cron: প্রতিদিন রাত 12টায় সব shops এর unpaid orders settle করবে
 */
cron.schedule('0 0 * * *', async () => {
  console.log('Auto settlement cron started...');
  try {
    const shops = await Shop.find({});
    for (let shop of shops) {
      try {
        const result = await settleShopOrders(shop._id);
        console.log(`Shop ${shop.name}: ${result.message}`);
      } catch (err) {
        console.error(`Shop ${shop.name} settlement error:`, err.message);
      }
    }
  } catch (err) {
    console.error('Auto settlement cron failed:', err.message);
  }
});


async function processSettlements() {
  const settlements = await Settlement.find({
    status: "PENDING",
    mature_at: { $lte: new Date() }
  });

  for (let s of settlements) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // 1️⃣ Wallet update
      await Wallet.updateOne(
        { shopId: s.shop },
        {
          $inc: {
            pending_settlement: -s.gross_amount,
            withdrawable_balance: s.net_amount
          }
        },
        { session }
      );

      // 2️⃣ Platform wallet fee
      await PlatformWallet.updateOne(
        {},
        { $inc: { balance: s.commission_amount } },
        { session, upsert: true }
      );

      const platformWallet = await PlatformWallet.findOne({});

      // 3️⃣ Ledger entries (schema compatible)
      await Ledger.insertMany([
        {
          shopId: s.shop,
          amount: s.gross_amount,
          type: "DEBIT",                   // debit for gross
          source: "ORDER_PAYMENT",
          referenceType: "SETTLEMENT",
          referenceId: s._id,
          balanceAfter: 0                   // optional: shop wallet balance after debit
        },
        {
          shopId: s.shop,
          amount: s.net_amount,
          type: "CREDIT",                  // credit for net amount
          source: "ORDER_PAYMENT",
          referenceType: "SETTLEMENT",
          referenceId: s._id,
          balanceAfter: 0
        },
        {
          shopId: s.shop,
          amount: s.commission_amount,
          type: "DEBIT",                   // commission is also a debit
          source: "COMMISSION",
          referenceType: "SETTLEMENT",
          referenceId: s._id,
          balanceAfter: platformWallet.balance
        }
      ], { session });

      // 4️⃣ Mark settlement as settled
      s.status = "SETTLED";
      s.settled_at = new Date();
      await s.save({ session });

      await session.commitTransaction();
      session.endSession();
      console.log(`Settlement processed: ${s._id}`);
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Settlement failed:", err);
    }
  }
}

module.exports = { processSettlements };
