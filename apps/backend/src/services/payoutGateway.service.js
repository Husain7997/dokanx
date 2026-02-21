const axios = require('axios');
const Ledger = require('../models/ledger.model');
const ShopWallet = require('../models/ShopWallet');
const { isTest } = require('../config/runtime');

if (isTest) {
  return mockResult;
}

/**
 * Payout Types:
 * type = BANK | BKASH | NAGAD
 */
exports.triggerPayout = async ({
  walletId,
  amount,
  type,
  referenceId,
  idempotencyKey
}) => {
  // Idempotency check (prevent double payout)
  const existing = await Ledger.findOne({
    meta: { referenceId, idempotencyKey }
  });
  if (existing) return existing;

  // Wallet fetch
  const wallet = await ShopWallet.findById(walletId);
  if (!wallet) throw new Error('Wallet not found');

  // Here call external API
  let result;
  switch (type) {
    case 'BANK':
      result = await fakeBankTransfer(wallet.bankAccount, amount);
      break;
    case 'BKASH':
      result = await fakeBKashTransfer(wallet.bkashNumber, amount);
      break;
    case 'NAGAD':
      result = await fakeNagadTransfer(wallet.nagadNumber, amount);
      break;
    default:
      throw new Error('Unsupported payout type');
  }

  // Ledger entry (immutable)
  const ledgerEntry = await Ledger.create({
    walletId,
    type: 'PAYOUT',
    direction: 'DEBIT',
    amount,
    meta: { referenceId, idempotencyKey, provider: type, status: result.status }
  });

  return ledgerEntry;
};

/**
 * Fake external calls (replace with real API SDK / HTTP)
 */
const fakeBankTransfer = async (account, amount) => {
  return { status: 'SUCCESS', txId: `BANK_${Date.now()}` };
};
const fakeBKashTransfer = async (number, amount) => {
  return { status: 'SUCCESS', txId: `BKASH_${Date.now()}` };
};
const fakeNagadTransfer = async (number, amount) => {
  return { status: 'SUCCESS', txId: `NAGAD_${Date.now()}` };
};
