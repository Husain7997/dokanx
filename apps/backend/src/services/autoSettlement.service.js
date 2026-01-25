


const Settlement = require('../models/Settlement');

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
    { upsert: true, new: true }
  );

  return settlement;
}

module.exports = { runAutoSettlement };

