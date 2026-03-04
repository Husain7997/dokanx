const Ledger = require("./ledger.model");

async function append(entry) {

  return Ledger.create({
    shopId: entry.shopId,
    amount: entry.amount,
    type: entry.type,
    referenceId: entry.referenceId,
    meta: entry.meta || {}
  });
}

module.exports = { append };