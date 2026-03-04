const Wallet = require("@/models/wallet.model");
const Ledger = require("@/modules/ledger/ledger.model");

async function rebuild(shopId) {
  const ledgers = await Ledger.find({ shop: shopId });

  let balance = 0;

  ledgers.forEach((l) => {
    if (l.type.includes("CREDIT")) balance += l.amount;
    else balance -= l.amount;
  });

  await Wallet.updateOne(
    { shop: shopId },
    { balance }
  );

  return {
    rebuiltBalance: balance,
  };
}

module.exports = {
  rebuild,
};