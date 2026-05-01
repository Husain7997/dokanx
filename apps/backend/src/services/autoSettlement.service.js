


const Settlement = require('../models/settlement.model');

async function runAutoSettlement(shopId, key) {
  const settlement = await Settlement.findOneAndUpdate(
    { shopId, idempotencyKey: key },
    {
      $setOnInsert: {
        grossAmount: 0,
        netPayable: 0,
        orderCount: 0,
        status: 'PAID',
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  return settlement;
}

module.exports = { runAutoSettlement };


