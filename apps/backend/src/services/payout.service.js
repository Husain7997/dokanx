// // services/payout.service.js

// const ShopWallet = require('../models/ShopWallet');
// const Payout = require('../models/payout.model');
// const Ledger = require('../models/ledger.model');
// const mongoose = require('mongoose');

// async function processShopPayout(shopId, amount) {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const wallet = await ShopWallet.findOne({ shop: shopId }).session(session);

//     if (!wallet || wallet.balance < amount) {
//       throw new Error('Insufficient wallet balance');
//     }

//     // Deduct from wallet
//     wallet.balance -= amount;
//     await wallet.save({ session });

//     // Record Payout
//     const payout = await Payout.create([{
//       shop: shopId,
//       amount
//     }], { session });

//     // Record Ledger entry
//     await Ledger.create([{
//       shop: shopId,
//       type: 'DEBIT',
//       amount,
//       payoutId: payout[0]._id
//     }], { session });

//     await session.commitTransaction();
//     session.endSession();

//     return { message: 'Payout successful', wallet };
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     throw error;
//   }
// }

// module.exports = { processShopPayout };


const Wallet = require("../models/wallet.model");
const Settlement = require("../models/settlement.model");

exports.processPayout = async (walletId) => {
  const wallet = await Wallet.findById(walletId);
  if (!wallet) throw new Error("Wallet not found");

  if (wallet.withdrawable_balance <= 0) {
    return { status: "NO_FUNDS" };
  }

  // Fake gateway simulation (no axios, no real call)
  const payoutResult = {
    status: "SUCCESS",
    gatewayRef: "PAYOUT-" + Date.now(),
  };

 await Wallet.updateOne(
  { _id: wallet._id },
  { $set: { withdrawable_balance: 0 } }
);

  

  return payoutResult;
};
