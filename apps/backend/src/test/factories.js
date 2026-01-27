const mongoose = require("mongoose");
const ShopWallet = require("../models/ShopWallet");
const Settlement = require("../models/settlement.model");
const Ledger = require("../models/ledger.model");

exports.oid = () => new mongoose.Types.ObjectId();

exports.createShopWallet = async (opts = {}) => {
  const shopId = opts.shopId || exports.oid();

  return ShopWallet.create({
    shop: shopId,
    shopId,
    balance: opts.balance ?? 0,
    bkashNumber: opts.bkashNumber ?? "01700000000"
  });
};

exports.createSettlement = async (opts = {}) => {
  return Settlement.create({
    shop: opts.shopId,
    shopId: opts.shopId,
    orderCount: opts.orderCount ?? 2,
    totalAmount: opts.totalAmount ?? 1000,
    grossAmount: opts.totalAmount ?? 1000,
    platformFee: opts.platformFee ?? 100,
    netAmount: (opts.totalAmount ?? 1000) - (opts.platformFee ?? 100),
    netPayout: (opts.totalAmount ?? 1000) - (opts.platformFee ?? 100),
    status: "PAID",
    idempotencyKey: `test-${Date.now()}`
  });
};

exports.createLedger = async (opts = {}) => {
  return Ledger.create({
    shopId: opts.shopId,
    walletId: opts.walletId,
    amount: opts.amount ?? 1000,
    direction: opts.direction ?? "CREDIT",
    type: opts.type ?? "ADJUSTMENT",
    referenceType: "TEST",
    source: "SYSTEM",
    balanceAfter: opts.balanceAfter ?? 1000
  });
};
