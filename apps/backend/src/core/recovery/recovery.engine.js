const ledgerAudit =
  require("@/core/selfheal/ledger.audit");
const FinancialEngine =
  require("@/core/financial/financial.engine");
const Settlement =
  require("@/models/settlement.model");
const PaymentAttempt =
  require("@/models/paymentAttempt.model");
const { eventBus } = require("@/core/infrastructure");

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
  console.log("Checking ledger integrity...");

  const issues =
    await ledgerAudit.findInconsistencies();

  for (const issue of issues) {
    console.log("Ledger mismatch:", issue);
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
  console.log("Checking settlements...");

  const stuck =
    await Settlement.find({
      status: "PENDING",
      createdAt: {
        $lt: new Date(Date.now() - 30 * 60 * 1000)
      }
    });

  for (const s of stuck) {
    console.log("Fixing stuck settlement", s._id);
    s.status = "FAILED";
    await s.save();

    eventBus.emit("SETTLEMENT_FAILED", {
      settlementId: s._id
    });
  }
}

async function repairPayments() {
  console.log("Checking payments...");

  const stuck =
    await PaymentAttempt.find({
      status: "PENDING",
      processed: false,
      createdAt: {
        $lt: new Date(Date.now() - 15 * 60 * 1000)
      }
    });

  for (const pay of stuck) {
    console.log("Retrying payment", pay._id);
    eventBus.emit("PAYMENT_RETRY", {
      attemptId: pay._id
    });
  }
}

exports.runRecovery = async () => {
  console.log("\nDokanX Auto Recovery Running...\n");

  await repairLedger();
  await repairSettlement();
  await repairPayments();

  console.log("\nRecovery completed\n");
};
