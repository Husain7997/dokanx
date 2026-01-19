const Wallet = require("../models/wallet.model");
const WalletTransaction = require("../models/walletTransaction.model");

async function creditWallet({ shopId, amount, reference, meta }) {
  let wallet = await Wallet.findOne({ shop: shopId });

  if (!wallet) {
    wallet = await Wallet.create({
      shop: shopId,
      balance: 0
    });
  }

  wallet.balance += amount;
  await wallet.save();

  await WalletTransaction.create({
    wallet: wallet._id,
    type: "CREDIT",
    amount,
    reference,
    meta
  });
}

module.exports = { creditWallet };
