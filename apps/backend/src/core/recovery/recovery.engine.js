const ledgerAudit =
  require("@/core/selfheal/ledger.audit");
const FinancialEngine =
  require("@/core/financial/financial.engine");
const Settlement =
  require("@/models/settlement.model");
const PaymentAttempt =
  require("@/models/paymentAttempt.model");
const { eventBus, logger } = require("@/core/infrastructure");

function buildRecoveryEntries(diff) {
  const amount = Math.abs(diff || 0);
  if (!amount) return null;

  const reason = diff > 0 ? "wallet_credit" : "wallet_debit";
  return [
    {
      type: "debit",
      amount,
      meta: { reason, source: "auto_recovery" }
    },
    {
      type: "credit",
      amount,
      meta: { reason, source: "auto_recovery" }
    }
  ];
}

async function repairLedger() {
  logger.info("Checking ledger integrity");

  const issues =
    await ledgerAudit.findInconsistencies();

  for (const issue of issues) {
    logger.warn({ issue }, "Ledger mismatch detected");
    const entries = buildRecoveryEntries(issue.diff);
    if (!entries) continue;

    await FinancialEngine.execute({
      tenantId: issue.shopId,
      idempotencyKey: `AUTO_RECOVERY_${issue.shopId}_${Date.now()}`,
      entries
    });
  }
}

async function repairSettlement() {
  logger.info("Checking settlements");

  const stuck =
    await Settlement.find({
      status: "PENDING",
      createdAt: {
        $lt: new Date(Date.now() - 30 * 60 * 1000)
      }
    });

  for (const s of stuck) {
    logger.warn({ settlementId: s._id }, "Fixing stuck settlement");
    s.status = "FAILED";
    await s.save();

    eventBus.emit("SETTLEMENT_FAILED", {
      settlementId: s._id
    });
  }
}

async function repairPayments() {
  logger.info("Checking payments");

  const stuck =
    await PaymentAttempt.find({
      status: "PENDING",
      processed: false,
      createdAt: {
        $lt: new Date(Date.now() - 15 * 60 * 1000)
      }
    });

  for (const pay of stuck) {
    logger.warn({ paymentAttemptId: pay._id }, "Retrying stuck payment");
    eventBus.emit("PAYMENT_RETRY", {
      attemptId: pay._id
    });
  }
}

exports.runRecovery = async () => {
  logger.info("DokanX auto recovery running");

  await repairLedger();
  await repairSettlement();
  await repairPayments();

  logger.info("Recovery completed");
};
