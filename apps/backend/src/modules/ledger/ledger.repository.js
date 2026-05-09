const Ledger = require("./ledger.model");

async function append(entry, session = null) {

  return Ledger.create([{
    shopId: entry.shopId,
    merchantId: entry.merchantId || entry.shopId,
    amount: Math.abs(Number(entry.amount || 0)),
    direction: entry.direction || (Number(entry.amount || 0) < 0 ? "DEBIT" : "CREDIT"),
    type: entry.type || "LEGACY",
    referenceId: entry.referenceId,
    referenceType: entry.referenceType || "MANUAL",
    status: entry.status || "CONFIRMED",
    meta: entry.meta || {}
  }], session ? { session } : undefined).then((rows) => rows[0]);
}

module.exports = { append };
