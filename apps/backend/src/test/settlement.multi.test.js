require('dotenv').config({ path: './src/test/.env.test' });

const { settleShopOrders } = require('../services/settlement.service');
const { processShopPayout } = require('../services/payout.service');
const Shop = require('../models/shop.model');
const ShopWallet = require('../models/ShopWallet');
const Order = require('../models/order.model');

describe('Multi-tenant settlement & payout', () => {
  it('should settle multiple shops independently', async () => {
    const shopA = await Shop.create({ name: 'A' });
    const shopB = await Shop.create({ name: 'B' });

    // Paid orders
    await Order.create([
      { shop: shopA._id, total: 100, status: 'PAID', settled: false },
      { shop: shopA._id, total: 200, status: 'PAID', settled: false },
      { shop: shopB._id, total: 150, status: 'PAID', settled: false }
    ]);

    const resultA = await settleShopOrders(shopA._id);
    const resultB = await settleShopOrders(shopB._id);

    expect(resultA.wallet.balance).toBe(300);
    expect(resultB.wallet.balance).toBe(150);
  });

  it('should allow shop payout correctly', async () => {
    const shop = await Shop.create({ name: 'Payout Shop' });
    await ShopWallet.create({ shop: shop._id, balance: 500 });

    const result = await processShopPayout(shop._id, 200);
    expect(result.wallet.balance).toBe(300);
  });
});
