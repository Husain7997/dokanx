const Wallet = require("../../models/wallet.model");

async function seedShopWallet(shopId, balance = 0) {
  return Wallet.findOneAndUpdate(
    { shopId },
    {
      shopId,
      balance,
      available_balance: balance,
      withdrawable_balance: balance,
      pending_settlement: 0,
      balances: {
        cash: balance,
        credit: 0,
        bank: 0,
      },
      currency: "BDT",
      status: "ACTIVE",
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
}

module.exports = {
  seedShopWallet,
};
