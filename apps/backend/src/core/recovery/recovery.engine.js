const ledgerAudit =
  require("@/core/selfheal/ledger.audit");

const FinancialEngine =
  require("@/core/financial/financial.engine");

const Settlement =
  require("@/models/settlement.model");

const PaymentAttempt =
  require("@/models/paymentAttempt.model");

const eventBus = require("@/infrastructure/events/eventBus");

/* =====================================
   LEDGER RECOVERY
===================================== */

async function repairLedger() {
  console.log("🧠 Checking ledger integrity...");

  const issues =
    await ledgerAudit.findInconsistencies();

  for (const issue of issues) {
    console.log("⚠ Ledger mismatch:", issue);

    await FinancialEngine.execute({
      shopId: issue.shopId,
      amount: issue.diff,
      type: "SYSTEM_REPAIR",
      referenceId: "AUTO_RECOVERY",
      meta: { reason: "Ledger mismatch auto fix" },
    });
  }
}

/* =====================================
   STUCK SETTLEMENT RECOVERY
===================================== */

async function repairSettlement() {
  console.log("🧠 Checking settlements...");

  const stuck =
    await Settlement.find({
      status: "PENDING",
      createdAt: {
        $lt: new Date(Date.now() - 30 * 60 * 1000),
      },
    });

  for (const s of stuck) {
    console.log("⚠ Fixing stuck settlement", s._id);

    s.status = "FAILED";
    await s.save();

    eventBus.emit("SETTLEMENT_FAILED", {
      settlementId: s._id,
    });
  }
}

/* =====================================
   PAYMENT RECOVERY
===================================== */

async function repairPayments() {
  console.log("🧠 Checking payments...");

  const stuck =
    await PaymentAttempt.find({
      status: "PENDING",
      processed: false,
      createdAt: {
        $lt: new Date(Date.now() - 15 * 60 * 1000),
      },
    });

  for (const pay of stuck) {
    console.log("⚠ Retrying payment", pay._id);

    eventBus.emit("PAYMENT_RETRY", {
      attemptId: pay._id,
    });
  }
}

/* =====================================
   RUN ALL RECOVERY
===================================== */

exports.runRecovery = async () => {
  console.log("\n♻ DokanX Auto Recovery Running...\n");

  await repairLedger();
  await repairSettlement();
  await repairPayments();

  console.log("\n✅ Recovery completed\n");
};