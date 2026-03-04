const FinancialEngine =
  require("@/core/financial/financial.engine");

/* ================================
   ADMIN WALLET ADJUSTMENT
================================ */

exports.adjustWallet = async (req, res) => {
  const { shopId, amount, reason } = req.body;

  const result = await FinancialEngine.execute({
    shopId,
    amount,
    type: "ADMIN_ADJUSTMENT",
    referenceId: req.user.id,
    meta: { reason },
  });

  res.json({
    success: true,
    balance: result.balance,
  });
};

/* ================================
   ADMIN REFUND
================================ */

exports.refundShop = async (req, res) => {
  const { shopId, amount, reason } = req.body;

  const result = await FinancialEngine.execute({
    shopId,
    amount: -Math.abs(amount), // debit
    type: "ADMIN_REFUND",
    referenceId: req.user.id,
    meta: { reason },
  });

  res.json({
    success: true,
    balance: result.balance,
  });
};