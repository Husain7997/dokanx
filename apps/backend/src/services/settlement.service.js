// src/services/settlement.service.js

const {
  FinancialEngine,
  FinancialTypes,
} = require("@/core/financial");

const { withLock } = require("@/core/infrastructure/lock.manager");

const { runOnce } =
  require("@/core/infrastructure");

async function processSettlement({
  shopId,
  grossAmount,
  fee,
  idempotencyKey,
}) {

  return runOnce(
    `settlement:${idempotencyKey}`,
    async () => {

      return FinancialEngine.execute({
  shopId,
  amount: grossAmount,
  type: "SETTLEMENT",
  referenceId: idempotencyKey,
  meta: { fee },
});

    }
  );
}

module.exports = {
  processSettlement,
};


