// services/payout.service.js

const ShopWallet = require('../models/ShopWallet');
const Payout = require('../models/Payout');
const Ledger = require('../models/Ledger');
const mongoose = require('mongoose');

async function processShopPayout(shopId, amount) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const wallet = await ShopWallet.findOne({ shop: shopId }).session(session);

    if (!wallet || wallet.balance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    // Deduct from wallet
    wallet.balance -= amount;
    await wallet.save({ session });

    // Record Payout
    const payout = await Payout.create([{
      shop: shopId,
      amount
    }], { session });

    // Record Ledger entry
    await Ledger.create([{
      shop: shopId,
      type: 'DEBIT',
      amount,
      payoutId: payout[0]._id
    }], { session });

    await session.commitTransaction();
    session.endSession();

    return { message: 'Payout successful', wallet };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

module.exports = { processShopPayout };
