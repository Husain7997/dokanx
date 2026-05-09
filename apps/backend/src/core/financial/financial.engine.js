const mongoose = require("mongoose");

const circuit =
  require("../selfheal/circuit.breaker");

const { publishEvent } =
  require("@/infrastructure/events/event.dispatcher");
const { createLedgerEntry } =
  require("@/services/ledger.service");

/* =========================================
   🔒 GLOBAL LEDGER CONTRACT
========================================= */

const REQUIRED = [
  "shopId",
  "amount",
  "type",
  "referenceId"
];

const ALLOWED = [
  "shopId",
  "amount",
  "type",
  "referenceId",
  "meta",
  "session"
];

const FORBIDDEN = [
  "reference",
  "metadata",
  "walletId",
  "direction",
  "source"
];

function validateCommand(cmd) {

  for (const key of REQUIRED) {
    if (cmd[key] === undefined)
      throw new Error(
        `FINANCIAL_CONTRACT_MISSING_${key}`
      );
  }

  for (const bad of FORBIDDEN) {
    if (bad in cmd)
      throw new Error(
        `ILLEGAL_FINANCIAL_FIELD_${bad}`
      );
  }

  Object.keys(cmd).forEach(k => {
    if (!ALLOWED.includes(k))
      throw new Error(
        `FINANCIAL_CONTRACT_VIOLATION_${k}`
      );
  });

  if (typeof cmd.amount !== "number")
    throw new Error("AMOUNT_MUST_BE_NUMBER");
}

/* =========================================
   CENTRAL MONEY ENGINE
========================================= */

async function execute(command) {

  validateCommand(command);

  return circuit.guard(async () => {

    const ownedSession =
      !command.session;
    const session =
      command.session ||
      await mongoose.startSession();

    try {

      if (ownedSession) {
        session.startTransaction();
      }

      const {
        shopId,
        amount,
        type,
        referenceId,
        meta = {}
      } = command;

      const result = await createLedgerEntry({
        merchantId: shopId,
        type: normalizeLedgerType(type),
        amount: Math.abs(amount),
        direction: amount < 0 ? "DEBIT" : "CREDIT",
        referenceId,
        referenceType: meta.referenceType || "MANUAL",
        status: "CONFIRMED",
        meta,
      }, { session });

      if (ownedSession) {
        await session.commitTransaction();
      }

      await publishEvent(
        "FINANCE_MUTATION",
        {
          shopId,
          amount,
          type,
          referenceId
        }
      );

      return { balance: Number(result.wallet?.availableBalance ?? result.wallet?.balance ?? 0) };

    } catch (err) {

      if (ownedSession) {
        await session.abortTransaction();
      }
      throw err;

    } finally {

      if (ownedSession) {
        session.endSession();
      }
    }

  });
}

function normalizeLedgerType(type) {
  const normalized = String(type || "").toUpperCase();
  if (normalized.includes("PAYOUT")) return "PAYOUT";
  if (normalized.includes("REFUND")) return "REFUND";
  if (normalized.includes("COMMISSION")) return "COMMISSION";
  if (normalized.includes("SALE") || normalized.includes("INCOME") || normalized.includes("CREDIT")) return "SALE";
  if (normalized.includes("EXPENSE") || normalized.includes("DEBIT")) return "EXPENSE";
  if (normalized.includes("ADJUST")) return "ADJUSTMENT";
  if (normalized.includes("TOPUP")) return "TOPUP";
  if (normalized.includes("TRANSFER")) return "TRANSFER";
  return "ADJUSTMENT";
}

module.exports = { execute };
