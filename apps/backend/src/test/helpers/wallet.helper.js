const Wallet = require("../../models/wallet.model");

async function seedShopWallet(shopId, balance = 0) {
  return Wallet.findOneAndUpdate(
    { shopId },
    {
      $set: {
        shopId,
        balance,
        available_balance: balance,
        withdrawable_balance: balance,
        currency: "BDT",
        status: "ACTIVE",
      },
    },
    { upsert: true, new: true }
  );
}

module.exports = { seedShopWallet };
