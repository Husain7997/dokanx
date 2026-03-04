const Wallet = require("../../modules/wallet/wallet.model");

exports.repairWallet = async (userId, correctBalance) => {

  await Wallet.updateOne(
    { userId },
    { balance: correctBalance }
  );

  console.log("Wallet auto repaired:", userId);
};