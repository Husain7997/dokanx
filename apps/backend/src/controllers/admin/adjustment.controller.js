const {
  executeFinancial
} = require("@/services/financialCommand.service");

async function executeWithTimeout(payload, timeoutMs = 10000) {
  return Promise.race([
    executeFinancial(payload),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Financial operation timeout")), timeoutMs);
    }),
  ]);
}

/* ================================
   ADMIN WALLET ADJUSTMENT
================================ */

exports.adjustWallet = async (req, res) => {
  try {
    const { shopId, amount, reason } = req.body;

    const result = await executeWithTimeout({
      shopId,
      amount,
      reason: reason || "admin_adjustment",
      idempotencyKey: `ADMIN_ADJUST_${shopId}_${req.user.id}_${Date.now()}`,
    });

    return res.json({
      success: true,
      transactionId: result.transactionId,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Adjustment failed",
    });
  }
};

/* ================================
   ADMIN REFUND
================================ */

exports.refundShop = async (req, res) => {
  try {
    const { shopId, amount, reason } = req.body;

    const result = await executeWithTimeout({
      shopId,
      amount: Math.abs(amount),
      reason: reason || "admin_refund",
      idempotencyKey: `ADMIN_REFUND_${shopId}_${req.user.id}_${Date.now()}`,
    });

    return res.json({
      success: true,
      transactionId: result.transactionId,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Refund failed",
    });
  }
};
