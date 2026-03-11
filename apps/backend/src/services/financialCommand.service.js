const FinancialEngine = require("@/core/financial/financial.engine");

function buildEntries(reason, amount) {
  const absAmount = Math.abs(Number(amount || 0));
  if (!absAmount) {
    throw new Error("Amount must be greater than 0");
  }

  return [
    {
      type: "debit",
      amount: absAmount,
      meta: { reason }
    },
    {
      type: "credit",
      amount: absAmount,
      meta: { reason }
    }
  ];
}

async function executeFinancial({
  shopId,
  idempotencyKey,
  amount,
  reason,
  entries
}) {
  return FinancialEngine.execute({
    tenantId: shopId,
    idempotencyKey: String(idempotencyKey),
    entries: Array.isArray(entries) && entries.length ? entries : buildEntries(reason, amount)
  });
}

module.exports = {
  buildEntries,
  executeFinancial
};
