const mongoose = require('mongoose');
require('dotenv').config({ path: 'apps/backend/.env' });

async function run() {
  const uri = (process.env.MONGO_URI || '').trim();
  if (!uri) throw new Error('MONGO_URI missing');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const { ObjectId } = mongoose.Types;

  const users = db.collection('users');
  const shops = db.collection('shops');
  const products = db.collection('products');
  const orders = db.collection('orders');
  const wallets = db.collection('wallets');
  const ledgers = db.collection('ledgers');

  const owner = await users.findOne({ email: 'merchant@dokanx.local' });
  if (!owner) throw new Error('merchant owner not found');

  let shop = await shops.findOne({ owner: owner._id });
  if (!shop) {
    const shopId = new ObjectId();
    await shops.insertOne({ _id: shopId, name: 'DokanX Demo Store', slug: 'dokanx-demo-store', owner: owner._id, isActive: true, status: 'ACTIVE', city: 'Sylhet', country: 'Bangladesh', merchantTier: 'GOLD', trustScore: 82, popularityScore: 71, commissionRate: 6, createdAt: new Date(), updatedAt: new Date() });
    await users.updateOne({ _id: owner._id }, { $set: { shopId } });
    shop = await shops.findOne({ _id: shopId });
  }

  const shopId = shop._id;
  const baseProducts = [
    { name: 'Fresh Milk 1L', price: 95, stock: 42, category: 'Groceries', brand: 'Farm Fresh' },
    { name: 'Brown Bread', price: 60, stock: 34, category: 'Bakery', brand: 'Daily Bake' },
    { name: 'Premium Rice 5kg', price: 540, stock: 18, category: 'Staples', brand: 'Golden Grain' },
    { name: 'Egg Pack 12pcs', price: 155, stock: 24, category: 'Groceries', brand: 'Village Egg' },
    { name: 'Mustard Oil 1L', price: 220, stock: 16, category: 'Cooking', brand: 'Shwapno Oil' },
    { name: 'Chicken Curry Cut 1kg', price: 320, stock: 11, category: 'Meat', brand: 'Fresh Meat' },
    { name: 'Tomato 1kg', price: 45, stock: 52, category: 'Vegetables', brand: 'Local Farm' },
    { name: 'Potato 2kg', price: 70, stock: 47, category: 'Vegetables', brand: 'Local Farm' }
  ];

  const productDocs = [];
  for (const item of baseProducts) {
    const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    await products.updateOne(
      { shopId, name: item.name },
      { $set: { shopId, name: item.name, category: item.category, brand: item.brand, slug, price: item.price, stock: item.stock, reserved: 0, isActive: true, moderationStatus: 'APPROVED', popularityScore: 50, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    productDocs.push(await products.findOne({ shopId, name: item.name }, { projection: { _id: 1, name: 1, price: 1 } }));
  }

  const customerSeeds = [
    { name: 'Rahim Uddin', email: 'rahim.customer@dokanx.local', phone: '01710000001', cash: 320, credit: 120, bank: 0 },
    { name: 'Karim Store', email: 'karim.customer@dokanx.local', phone: '01710000002', cash: 180, credit: 420, bank: 0 },
    { name: 'Nusrat Jahan', email: 'nusrat.customer@dokanx.local', phone: '01710000003', cash: 250, credit: 90, bank: 0 }
  ];

  const customerDocs = [];
  for (const c of customerSeeds) {
    await users.updateOne(
      { email: c.email },
      { $set: { name: c.name, email: c.email, phone: c.phone, role: 'CUSTOMER', shopId, language: 'en', isBlocked: false, customerWallet: { cash: c.cash, credit: c.credit, bank: c.bank, updatedAt: new Date() }, updatedAt: new Date() }, $setOnInsert: { password: 'demo-password', createdAt: new Date(), addresses: [], savedPaymentMethods: [] } },
      { upsert: true }
    );
    customerDocs.push(await users.findOne({ email: c.email }, { projection: { _id: 1, name: 1, email: 1, phone: 1 } }));
  }

  await wallets.updateOne(
    { shopId },
    { $set: { shopId, balance: 5850, available_balance: 4700, pending_settlement: 1150, withdrawable_balance: 4300, balances: { cash: 4300, credit: 900, bank: 650 }, currency: 'BDT', status: 'ACTIVE', updatedAt: new Date() }, $setOnInsert: { createdAt: new Date(), isFrozen: false } },
    { upsert: true }
  );

  const now = new Date();
  const orderSeeds = [
    { ref: 'ORD-1001', customer: customerDocs[0], status: 'PLACED', paymentStatus: 'PENDING', paymentMode: 'COD', totalAmount: 560, items: [0, 1], daysAgo: 0 },
    { ref: 'ORD-1002', customer: customerDocs[1], status: 'CONFIRMED', paymentStatus: 'SUCCESS', paymentMode: 'ONLINE', totalAmount: 1280, items: [2, 3], daysAgo: 1 },
    { ref: 'ORD-1003', customer: customerDocs[2], status: 'SHIPPED', paymentStatus: 'SUCCESS', paymentMode: 'WALLET', totalAmount: 890, items: [4, 6], daysAgo: 2 },
    { ref: 'ORD-1004', customer: customerDocs[0], status: 'DELIVERED', paymentStatus: 'SUCCESS', paymentMode: 'ONLINE', totalAmount: 410, items: [1, 6, 7], daysAgo: 4 }
  ];

  for (const seed of orderSeeds) {
    const chosen = seed.items.map((idx) => productDocs[idx]).filter(Boolean);
    const createdAt = new Date(now.getTime() - seed.daysAgo * 86400000);
    await orders.updateOne(
      { 'metadata.reference': seed.ref, shopId },
      { $set: { shop: shopId, shopId, customer: seed.customer._id, customerId: seed.customer._id, user: seed.customer._id, items: chosen.map((p, idx) => ({ product: p._id, quantity: idx === 0 ? 1 : 2, price: p.price })), totalAmount: seed.totalAmount, isGuest: false, contact: { phone: seed.customer.phone, email: seed.customer.email }, paymentStatus: seed.paymentStatus, status: seed.status, channel: 'MOBILE', trafficType: 'marketplace', paymentMode: seed.paymentMode, deliveryAddress: { line1: 'Zindabazar', city: 'Sylhet', area: 'City Centre', country: 'Bangladesh' }, metadata: { reference: seed.ref }, isSettled: seed.status === 'DELIVERED', updatedAt: new Date(), createdAt } },
      { upsert: true }
    );
  }

  const ledgerSeeds = [
    { referenceId: 'ORD-1001', type: 'SALE_SETTLEMENT', amount: 2600, daysAgo: 0 },
    { referenceId: 'BANK-01', type: 'WITHDRAWAL', amount: -900, daysAgo: 1 },
    { referenceId: 'ORD-1002', type: 'SALE_SETTLEMENT', amount: 1750, daysAgo: 2 }
  ];

  for (const entry of ledgerSeeds) {
    const createdAt = new Date(now.getTime() - entry.daysAgo * 86400000);
    await ledgers.updateOne(
      { shopId, referenceId: entry.referenceId },
      { $set: { shopId, amount: entry.amount, type: entry.type, referenceId: entry.referenceId, meta: { seeded: true }, createdAt, updatedAt: new Date() } },
      { upsert: true }
    );
  }

  console.log(JSON.stringify({
    shopId: String(shopId),
    products: await products.countDocuments({ shopId }),
    customers: await users.countDocuments({ shopId, role: 'CUSTOMER' }),
    orders: await orders.countDocuments({ shopId }),
    ledger: await ledgers.countDocuments({ shopId })
  }, null, 2));
  await mongoose.disconnect();
}

run().catch(async (error) => { console.error(error); try { await mongoose.disconnect(); } catch {} process.exit(1); });
