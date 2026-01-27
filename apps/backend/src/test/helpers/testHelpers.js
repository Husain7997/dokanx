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
async function createShopWallet(overrides = {}) {
  await ensureConnected();

  const shop = overrides.shop || (await createShop());

const wallet = await Wallet.create({
  shopId: shop._id,
  balance: overrides.balance || 0,
  withdrawable_balance: overrides.balance || 0, // 🔥 ADD THIS
  currency: "BDT",
});


  return {
    wallet,
    shopId: shop._id,
  };
}

// 🔹 Create ledger entry
async function createLedger(overrides = {}) {
  await ensureConnected();

  return await Ledger.create({
    shopId: overrides.shopId,

    amount: overrides.amount ?? 100,

    type: overrides.type || "CREDIT",

    // ✅ MUST match Ledger enum
    source: overrides.source || "SETTLEMENT",
    referenceType: overrides.referenceType || "SETTLEMENT",

    referenceId: overrides.referenceId || "REF-" + Date.now(),

    balanceAfter: overrides.balanceAfter ?? 100,
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
