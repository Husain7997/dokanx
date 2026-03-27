const axios = require("axios");
const Ledger = require("../../modules/ledger/ledger.model");
const walletAdapter = require("../../services/wallet/walletAdapter.service");
const { isTest } = require("../../config/runtime");

function getMockResult() {
  return {
    success: true,
    transactionId: "mock_txn",
    status: "SUCCESS",
  };
}

async function fakeBankTransfer(account, amount) {
  if (isTest) return getMockResult();
  return { status: "SUCCESS", txId: `BANK_${Date.now()}` };
}

async function fakeBKashTransfer(number, amount) {
  if (isTest) return getMockResult();
  return { status: "SUCCESS", txId: `BKASH_${Date.now()}` };
}

async function fakeNagadTransfer(number, amount) {
  if (isTest) return getMockResult();
  return { status: "SUCCESS", txId: `NAGAD_${Date.now()}` };
}

async function triggerPayout({
  walletId,
  amount,
  type,
  referenceId,
  idempotencyKey,
}) {
  const existing = await Ledger.findOne({
    meta: { referenceId, idempotencyKey },
  });
  if (existing) return existing;

  const wallet = await walletAdapter.findById(walletId);
  if (!wallet) throw new Error("Wallet not found");

  let result;
  switch (type) {
    case "BANK":
      result = await fakeBankTransfer(wallet.bankAccount, amount);
      break;
    case "BKASH":
      result = await fakeBKashTransfer(wallet.bkashNumber, amount);
      break;
    case "NAGAD":
      result = await fakeNagadTransfer(wallet.nagadNumber, amount);
      break;
    default:
      throw new Error("Unsupported payout type");
  }

  const providerStatus = result.status || (result.success ? "SUCCESS" : "FAILED");

  const ledgerEntry = await Ledger.create({
    walletId,
    type: "PAYOUT",
    direction: "DEBIT",
    amount,
    meta: { referenceId, idempotencyKey, provider: type, status: providerStatus },
  });

  return ledgerEntry;
}

module.exports = {
  triggerPayout,
  getMockResult,
};
