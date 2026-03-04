const {
  FinancialEngine,
  FinancialTypes,
} = require("@/core/financial");

async function simulate(shopId) {
  const operations = [];

  for (let i = 0; i < 5; i++) {
    operations.push(
      FinancialEngine.execute({
        type: FinancialTypes.OPERATIONS.WALLET_CREDIT,
        shopId,
        amount: 100,
        referenceId: `SIM_CREDIT_${i}`,
      })
    );
  }

  for (let i = 0; i < 3; i++) {
    operations.push(
      FinancialEngine.execute({
        type: FinancialTypes.OPERATIONS.WALLET_DEBIT,
        shopId,
        amount: 50,
        referenceId: `SIM_DEBIT_${i}`,
      })
    );
  }

  await Promise.all(operations);

  return {
    message: "Simulation Completed",
  };
}

module.exports = {
  simulate,
};