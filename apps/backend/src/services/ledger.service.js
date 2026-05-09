const Ledger = require("../modules/ledger/ledger.model");
const Wallet = require("../models/wallet.model");

const LEDGER_TYPES = new Set(["SALE", "EXPENSE", "REFUND", "PAYOUT", "COMMISSION", "ADJUSTMENT", "TOPUP", "TRANSFER", "LEGACY"]);
const DIRECTIONS = new Set(["CREDIT", "DEBIT"]);
const STATUSES = new Set(["PENDING", "CONFIRMED", "CANCELLED"]);

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function normalizeEntry(data = {}) {
  const shopId = data.merchantId || data.shopId;
  const amount = roundMoney(Math.abs(Number(data.amount || 0)));
  const direction = String(data.direction || "").toUpperCase();
  const type = String(data.type || "").toUpperCase();
  const status = String(data.status || "CONFIRMED").toUpperCase();

  if (!shopId) throw new Error("merchantId is required");
  if (!amount || amount <= 0) throw new Error("Ledger amount must be greater than zero");
  if (!LEDGER_TYPES.has(type)) throw new Error(`Invalid ledger type ${type || "(empty)"}`);
  if (!DIRECTIONS.has(direction)) throw new Error(`Invalid ledger direction ${direction || "(empty)"}`);
  if (!STATUSES.has(status)) throw new Error(`Invalid ledger status ${status || "(empty)"}`);
  if (!data.referenceId) throw new Error("referenceId is required");

  return {
    merchantId: shopId,
    shopId,
    type,
    amount,
    direction,
    referenceId: String(data.referenceId),
    referenceType: String(data.referenceType || "MANUAL").toUpperCase(),
    status,
    meta: data.meta || {},
  };
}

async function calculateWalletSnapshot(merchantId, options = {}) {
  const entries = await Ledger.find({
    shopId: merchantId,
    status: { $in: ["PENDING", "CONFIRMED"] },
  })
    .session(options.session || null)
    .lean();

  const existing = await Wallet.findOne({ shopId: merchantId }).session(options.session || null).lean();
  let confirmed = 0;
  let pending = 0;
  for (const entry of entries) {
    const signed = entry.direction === "DEBIT" ? -Math.abs(Number(entry.amount || 0)) : Math.abs(Number(entry.amount || 0));
    if (entry.status === "PENDING") pending += signed;
    if (entry.status === "CONFIRMED") confirmed += signed;
  }

  if (!entries.length && Number(existing?.balance || 0) > 0) {
    confirmed = Number(existing.balance || 0) + Number(existing.lockedBalance || 0);
  }
  const lockedBalance = roundMoney(existing?.lockedBalance || 0);
  const availableBalance = roundMoney(confirmed - lockedBalance);

  if (availableBalance < 0) {
    const error = new Error("Wallet invariant failed: available balance cannot be negative");
    error.code = "NEGATIVE_WALLET_BALANCE";
    error.availableBalance = availableBalance;
    throw error;
  }

  return {
    confirmed: roundMoney(confirmed),
    pendingBalance: roundMoney(pending),
    lockedBalance,
    availableBalance,
  };
}

async function updateWalletBalance(merchantId, options = {}) {
  const snapshot = await calculateWalletSnapshot(merchantId, options);
  const wallet = await Wallet.findOneAndUpdate(
    { shopId: merchantId },
    {
      $set: {
        shopId: merchantId,
        balance: snapshot.availableBalance,
        availableBalance: snapshot.availableBalance,
        pendingBalance: snapshot.pendingBalance,
        lockedBalance: snapshot.lockedBalance,
        available_balance: snapshot.availableBalance,
        withdrawable_balance: snapshot.availableBalance,
        pending_settlement: snapshot.pendingBalance,
        "balances.cash": snapshot.availableBalance,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        currency: "BDT",
        status: "ACTIVE",
        isFrozen: false,
      },
    },
    { upsert: true, returnDocument: "after", session: options.session || null }
  );
  return wallet;
}

async function createLedgerEntry(data, options = {}) {
  const entry = normalizeEntry(data);
  const existing = await Ledger.findOne({
    shopId: entry.shopId,
    type: entry.type,
    referenceType: entry.referenceType,
    referenceId: entry.referenceId,
  }).session(options.session || null);

  if (existing) {
    if (existing.status !== entry.status && existing.status !== "CANCELLED") {
      existing.status = entry.status;
      existing.direction = entry.direction;
      existing.amount = entry.amount;
      existing.meta = { ...(existing.meta || {}), ...(entry.meta || {}) };
      await existing.save(options.session ? { session: options.session } : undefined);
    }
    await updateWalletBalance(entry.shopId, options);
    return { entry: existing, duplicate: true, wallet: await Wallet.findOne({ shopId: entry.shopId }).session(options.session || null) };
  }

  if (entry.direction === "DEBIT" && entry.status === "CONFIRMED" && !options.skipBalanceCheck) {
    const wallet = await updateWalletBalance(entry.shopId, options);
    if (Number(wallet.availableBalance ?? wallet.balance ?? 0) < entry.amount) {
      const error = new Error("Insufficient balance");
      error.code = "INSUFFICIENT_BALANCE";
      error.availableBalance = Number(wallet.availableBalance ?? wallet.balance ?? 0);
      throw error;
    }
  }

  const rows = await Ledger.create([entry], options.session ? { session: options.session } : undefined);
  const wallet = await updateWalletBalance(entry.shopId, options);
  return { entry: rows[0], duplicate: false, wallet };
}

async function lockWalletAmount(merchantId, amount, options = {}) {
  const numericAmount = roundMoney(Math.abs(Number(amount || 0)));
  if (!numericAmount) throw new Error("Lock amount must be greater than zero");
  const wallet = await updateWalletBalance(merchantId, options);
  const available = Number(wallet.availableBalance ?? wallet.balance ?? 0);
  if (available < numericAmount) {
    const error = new Error("Insufficient balance");
    error.code = "INSUFFICIENT_BALANCE";
    error.availableBalance = available;
    throw error;
  }
  return Wallet.findOneAndUpdate(
    { shopId: merchantId, availableBalance: { $gte: numericAmount } },
    {
      $inc: {
        availableBalance: -numericAmount,
        lockedBalance: numericAmount,
        available_balance: -numericAmount,
        withdrawable_balance: -numericAmount,
        balance: -numericAmount,
        "balances.cash": -numericAmount,
      },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after", session: options.session || null }
  );
}

async function releaseLockedAmount(merchantId, amount, options = {}) {
  const numericAmount = roundMoney(Math.abs(Number(amount || 0)));
  const wallet = await Wallet.findOneAndUpdate(
    { shopId: merchantId, lockedBalance: { $gte: numericAmount } },
    {
      $inc: {
        availableBalance: numericAmount,
        lockedBalance: -numericAmount,
        available_balance: numericAmount,
        withdrawable_balance: numericAmount,
        balance: numericAmount,
        "balances.cash": numericAmount,
      },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after", session: options.session || null }
  );
  if (!wallet) throw new Error("Locked balance is insufficient");
  return wallet;
}

async function consumeLockedAmount(merchantId, amount, options = {}) {
  const numericAmount = roundMoney(Math.abs(Number(amount || 0)));
  const wallet = await Wallet.findOneAndUpdate(
    { shopId: merchantId, lockedBalance: { $gte: numericAmount } },
    {
      $inc: { lockedBalance: -numericAmount },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after", session: options.session || null }
  );
  if (!wallet) throw new Error("Locked balance is insufficient");
  return updateWalletBalance(merchantId, options);
}

module.exports = {
  createLedgerEntry,
  updateWalletBalance,
  lockWalletAmount,
  releaseLockedAmount,
  consumeLockedAmount,
  calculateWalletSnapshot,
};
