const Ledger =
  require("@/modules/ledger/ledger.model");

exports.calculate = async event => {

  let score = 0;

  /* ===== refund abuse ===== */

  if (event.type === "REFUND_CREATED")
    score += 30;

  /* ===== large transaction ===== */

  if (event.payload?.amount > 50000)
    score += 25;

  /* ===== repeated payments ===== */

  if (event.type === "PAYMENT_RETRY")
    score += 20;

  return {
    score,
    reason: "basic-ai-risk"
  };
};