const mongoose = require("mongoose");

const User = require("../../models/user.model");
const Shop = require("../../models/shop.model");
const Wallet = require("../../models/wallet.model");
const Ledger = require("../../models/ledger.model");
const Settlement = require("../../models/settlement.model");
const TaxRule = require("../../models/TaxRule");


const USER_ROLES = {
  owner: "OWNER",
  ADMIN: "ADMIN",
  STAFF: "STAFF",
  CUSTOMER: "CUSTOMER",
};
// 🔹 Ensure mongoose connected
async function ensureConnected() {
  if (mongoose.connection.readyState !== 1) {
    throw new Error("❌ Mongoose not connected. Check jest.setup.js");
  }
}


// 🔹 Create user
async function createUser(overrides = {}) {
  await ensureConnected();

  return await User.create({
    email:
  overrides.email ||
  `user-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
    password: "123456",
    role: overrides.role || USER_ROLES.OWNER,

  });
}

// 🔹 Create shop
async function createShop(overrides = {}) {
  await ensureConnected();

  const owner = overrides.owner || (await createUser());

  return await Shop.create({
    name: overrides.name || "Test Shop " + Date.now(),
    domain: overrides.domain || `test-${Date.now()}.dokanx.com`,
    owner: owner._id,
  });
}

// 🔹 Create wallet


// 🔹 Create wallet (FIXED)
async function createShopWallet({ balance = 0 } = {}) {
  await ensureConnected();

  const owner = await createUser();
  const shop = await Shop.create({
    name: 'Test Shop ' + Date.now(),
    owner: owner._id,
  });

  const wallet = await Wallet.create({
    shopId: shop._id, // ✅ MUST MATCH SCHEMA
    balance: balance,
    available_balance: balance,
    withdrawable_balance: balance,
    currency: 'BDT',
    status: 'ACTIVE',
  });

  return { shop, wallet, owner };
}


// 🔹 Create ledger entry
async function createLedger(overrides = {}) {
  await ensureConnected();

  const shopId =
    overrides.shopId ||
    (overrides.walletId
      ? (await Wallet.findById(overrides.walletId))?.shopId
      : null);

  if (!shopId) {
    throw new Error('shopId is required for ledger');
  }

  return await Ledger.create({
    shopId,
    walletId: overrides.walletId,
    amount: overrides.amount ?? 100,
    type: overrides.type ?? 'CREDIT',
    source: overrides.source ?? 'SYSTEM',
    referenceType: overrides.referenceType ?? 'TEST',
    reference: overrides.reference ?? 'TEST',
    balanceAfter: overrides.balanceAfter ?? 0,
  });
}



// 🔹 Create settlement
async function createSettlement(overrides = {}) {
  await ensureConnected();

  return Settlement.create({
    shop: overrides.shopId,        // ✅ REQUIRED
    shopId: overrides.shopId,      // ✅ REQUIRED
    idempotencyKey:
      overrides.idempotencyKey || `settle-${Date.now()}`,
    orderCount: overrides.orderCount ?? 1, // ✅ REQUIRED
    totalAmount: overrides.totalAmount ?? 1000,
    commission: overrides.commission ?? 50,
    taxAmount: overrides.taxAmount ?? 0,
    netAmount:
      (overrides.totalAmount ?? 1000) -
      (overrides.commission ?? 50),
    status: overrides.status || 'COMPLETED'
  });
}



// 🔹 Create tax rule (🔥 FIXED: type is REQUIRED)
async function createTaxRule(overrides = {}) {
  await ensureConnected();

  return await TaxRule.create({
    name: overrides.name || "VAT",
    type: overrides.type || "PERCENTAGE",   // 🔥 THIS FIX FIXES VALIDATION ERROR
    rate: overrides.rate || 15,
    active: true,
  });
}

module.exports = {
  createUser,
  createShop,
  createShopWallet,
  createLedger,
  createSettlement,
  createTaxRule,
};
