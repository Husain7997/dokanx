const Ledger = require("./ledger.model");

async function append(entry, session = null) {

  return Ledger.create([{
    shopId: entry.shopId,
    amount: entry.amount,
    type: entry.type,
    referenceId: entry.referenceId,
    meta: entry.meta || {}
  }], session ? { session } : undefined).then((rows) => rows[0]);
}

module.exports = { append };
