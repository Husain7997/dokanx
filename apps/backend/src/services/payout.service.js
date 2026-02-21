const Wallet = require('../models/wallet.model');
const Payout = require('../models/payout.model');
const Ledger = require('../models/ledger.model');
const crypto = require('crypto');
const bus =
require("../infrastructure/events/eventBus");




/**
 * Core payout processor
 */
async function processPayout({ walletId, shopId }) {
  let wallet;

  if (walletId) {
    wallet = await Wallet.findById(walletId);
  } else if (shopId) {
    wallet = await Wallet.findOne({ shopId });
  }

  if (!wallet) {
    throw new Error('Wallet not found');
  }

  const resolvedShopId = wallet.shopId;

  // 🔁 Check ANY existing payout (FAILED / PROCESSING)
  let payout = await Payout.findOne({
    shopId: resolvedShopId,
    status: { $ne: 'SUCCESS' },
  });

  // 🆕 Create payout ONLY if none exists
  if (!payout) {
  payout = await Payout.create({
    shopId: resolvedShopId,
    amount:
      wallet.withdrawable_balance > 0
        ? wallet.withdrawable_balance
        : wallet.balance,
    type: 'AUTO',
    requestedBy: resolvedShopId,
    status: 'FAILED',

    // ✅ UNIQUE, NON-NULL reference
    reference: `PAYOUT_${resolvedShopId}_${Date.now()}_${crypto
      .randomBytes(4)
      .toString('hex')}`,
  });
}


  // 🔁 Idempotent success
  if (payout.status === 'SUCCESS') {
    return payout;
  }

  // ✅ Mark success
  payout.status = 'SUCCESS';
  bus.emit("PAYOUT_COMPLETED", {
  payoutId: payout._id,
});
  payout.processedAt = new Date();
  await payout.save();

  // ✅ Wallet update
  wallet.balance -= payout.amount;
  wallet.withdrawable_balance = 0;
  await wallet.save();

  // ✅ Ledger
  await Ledger.create({
    shopId: resolvedShopId,
    walletId: wallet._id,
    type: 'DEBIT',
    amount: payout.amount,
    source: 'PAYOUT',
    referenceType: 'SYSTEM',
    referenceId: `PAYOUT:${payout._id}`,
    balanceAfter: wallet.balance,
  });

  return payout;
}


async function retryFailedPayout(walletId) {
  return processPayout({ walletId });
}

/**
 * API entry
 */
async function createShopPayoutRequest({ shopId, amount, userId }) {
   let wallet = await Wallet.findOne({ shopId });

if (!wallet) {
  wallet = await Wallet.create({
    shopId,
    balance: 0,
    available_balance: 0,
    withdrawable_balance: 0,
    currency: 'BDT',
    status: 'ACTIVE',
  });
}


  if (wallet.withdrawable_balance < amount) {
    throw new Error('Insufficient balance');
  }

  wallet.withdrawable_balance -= amount;
  await wallet.save();

  return {
    status: 'REQUESTED',
    amount,
    shopId,
    userId,
  };
}

module.exports = {
  processPayout,
  retryFailedPayout,
  createShopPayoutRequest,
};
