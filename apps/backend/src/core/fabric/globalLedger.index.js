exports.record = async entry => {

  await GlobalLedger.create({
    region: entry.region,
    ledgerId: entry.id,
    amount: entry.amount,
    currency: entry.currency
  });

};