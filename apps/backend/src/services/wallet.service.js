const {
  FinancialEngine,
  FinancialTypes,
} =
 require("@/core/financial");

const { runOnce } =
 require("@/core/infrastructure");

async function creditWallet({
  shopId,
  amount,
  referenceId
}) {

  return runOnce(
    `wallet-credit:${referenceId}`,
    () =>
      FinancialEngine.execute({
  shopId,
  amount,
  type: "WALLET_CREDIT",
  referenceId
})
  );
}

async function debitWallet({
  shopId,
  amount,
  referenceId
}) {

  FinancialEngine.execute({
  shopId,
  amount: -Math.abs(amount),
  type: "WALLET_DEBIT",
  referenceId
});
}

module.exports = {
  creditWallet,
  debitWallet
};