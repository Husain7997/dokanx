const ledgerAudit = require("@/core/selfheal/ledger.audit");
const FinancialEngine = require("@/core/financial/financial.engine");
const Settlement = require("@/models/settlement.model");
const PaymentAttempt = require("@/models/paymentAttempt.model");
const eventBus = require("@/infrastructure/events/eventBus");

async function repairLedger() {
  console.log("Checking ledger integrity...");

  const maxIssues = Number(process.env.RECOVERY_MAX_ISSUES_PER_RUN || 25);
  const issues = (await ledgerAudit.findInconsistencies()).slice(0, maxIssues);

  if (!issues.length) {
    console.log("No ledger mismatch found.");
    return;
  }

  for (const issue of issues) {
    console.log("Ledger mismatch:", issue);

    if (!issue?.diff) continue;

    if (issue.diff < 0) {
      console.warn("Recovery skipped due to negative balance adjustment:", issue);
      continue;
    }

    try {
      await FinancialEngine.execute({
        shopId: issue.shopId,
        amount: issue.diff,
        type: "SYSTEM_REPAIR",
        referenceId: `AUTO_RECOVERY:${issue.shopId}`,
        meta: { reason: "Ledger mismatch auto fix" },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("Recovery error:", message);
      if (message.includes("CIRCUIT OPEN")) break;
    }
  }
}

async function repairSettlement() {
  console.log("Checking settlements...");
  const stuck = await Settlement.find({
    status: "PENDING",
    createdAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) },
  }).limit(20);

  for (const s of stuck) {
    console.log("Fixing stuck settlement", s._id);
    s.status = "FAILED";
    await s.save();
    eventBus.emit("SETTLEMENT_FAILED", { settlementId: s._id });
  }
}

async function repairPayments() {
  console.log("Checking payments...");
  const stuck = await PaymentAttempt.find({
    status: "PENDING",
    processed: false,
    createdAt: { $lt: new Date(Date.now() - 15 * 60 * 1000) },
  }).limit(20);

  for (const pay of stuck) {
    console.log("Retrying payment", pay._id);
    eventBus.emit("PAYMENT_RETRY", { attemptId: pay._id });
  }
}

exports.runRecovery = async () => {
  console.log("\nDokanX Auto Recovery Running...\n");
  await repairLedger();
  await repairSettlement();
  await repairPayments();
  console.log("\nRecovery completed\n");
};
