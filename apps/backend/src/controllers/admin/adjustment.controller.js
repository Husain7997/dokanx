const {
  executeFinancial
} = require("@/services/financialCommand.service");

/* ================================
   ADMIN WALLET ADJUSTMENT
================================ */

exports.adjustWallet = async (req, res) => {
  const { shopId, amount, reason } = req.body;

  const result = await executeFinancial({
    shopId,
    amount,
    reason: reason || "admin_adjustment",
    idempotencyKey: `ADMIN_ADJUST_${shopId}_${req.user.id}_${Date.now()}`,
  });

  res.json({
    success: true,
    transactionId: result.transactionId,
  });
};

/* ================================
   ADMIN REFUND
================================ */

exports.refundShop = async (req, res) => {
  const { shopId, amount, reason } = req.body;

  const result = await executeFinancial({
    shopId,
    amount: Math.abs(amount),
    reason: reason || "admin_refund",
    idempotencyKey: `ADMIN_REFUND_${shopId}_${req.user.id}_${Date.now()}`,
  });

  res.json({
    success: true,
    transactionId: result.transactionId,
  });
};
