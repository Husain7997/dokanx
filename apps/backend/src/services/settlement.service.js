

const Settlement = require('../models/Settlement');
const Order = require('../models/order.model');
const ShopWallet = require('../models/ShopWallet');

async function processShopSettlement(shopId, key) {
  const existing = await Settlement.findOne({
    shopId,
    idempotencyKey: key,
  });

  if (existing) return existing;

  const orders = await Order.find({
    shop: shopId,
    paymentStatus: 'SUCCESS',
    settled: { $ne: true },
  });

  const orderCount = orders.length;
  const total = orders.reduce((s, o) => s + o.totalAmount, 0);

  const settlement = await Settlement.create({
    shopId,
    orderCount,
    grossAmount: total,
    netPayable: total,
    status: 'PAID',
    idempotencyKey: key,
  });

  await Order.updateMany(
    { _id: { $in: orders.map(o => o._id) } },
    { $set: { settled: true } }
  );

  const wallet =
    (await ShopWallet.findOne({ shop: shopId })) ||
    (await ShopWallet.create({ shop: shopId, balance: 0 }));

  wallet.balance += total;
  await wallet.save();

  return settlement;
}

module.exports = { processShopSettlement };

