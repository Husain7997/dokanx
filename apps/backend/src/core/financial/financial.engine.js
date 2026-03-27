const Wallet =
  require("@/models/wallet.model");

const ledgerRepo =
  require("@/modules/ledger/ledger.repository");

const mongoose = require("mongoose");

const circuit =
  require("../selfheal/circuit.breaker");

const { publishEvent } =
  require("@/infrastructure/events/event.dispatcher");

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

      const wallet =
        await Wallet.findOne(
          { shopId },
          null,
          { session }
        );

      if (!wallet)
        throw new Error("Wallet not found");

      const newBalance =
        wallet.balance + amount;

      if (newBalance < 0)
        throw new Error(
          "INSUFFICIENT_BALANCE"
        );

      wallet.balance = newBalance;

      await wallet.save({ session });

      await ledgerRepo.append({
        shopId,
        amount,
        type,
        referenceId,
        meta
      }, session);

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

      return { balance: newBalance };

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

module.exports = { execute };
