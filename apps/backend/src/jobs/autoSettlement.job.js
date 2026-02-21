const cron = require('node-cron');
const SettlementLock = require('../models/SettlementLock');
const Shop = require('../models/shop.model');
const { runAutoSettlement } = require('../services/autoSettlement.service');

if (process.env.NODE_ENV === 'test') {
  module.exports = {
    startAutoSettlementCron: () => {},
  };
  return;
}

async function lockShop(shopId) {
  try {
    await SettlementLock.create({
      shopId,
      lockedAt: new Date(),
    });
    return true;
  } catch {
    return false;
  }
}

function startAutoSettlementCron() {
  cron.schedule('0 2 * * *', async () => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - 1);
    from.setHours(0, 0, 0, 0);

    const to = new Date(from);
    to.setHours(23, 59, 59, 999);

    const shops = await Shop.find({ isActive: true });

    for (const shop of shops) {
      if (!(await lockShop(shop._id))) continue;

      try {
        await runAutoSettlement({
          shopId: shop._id,
          from,
          to,
        });
      } catch (err) {
        console.error('Auto settlement failed', shop._id, err);
      }
    }
  });
}

module.exports = { startAutoSettlementCron };
