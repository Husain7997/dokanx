// src/services/settlement.service.js

const { runOnce } =
  require("@/core/infrastructure");
const {
  executeFinancial
} = require("@/services/financialCommand.service");

async function processSettlement({
  shopId,
  grossAmount,
  fee,
  idempotencyKey,
}) {

  return runOnce(
    `settlement:${idempotencyKey}`,
    async () => {

      return executeFinancial({
        shopId,
        amount: grossAmount,
        idempotencyKey,
        reason: "wallet_credit"
      });

    }
  );
}

module.exports = {
  processSettlement,
};


