const ReconciliationReport = require("@/models/ReconciliationReport");
const reportService = require("@/modules/billing/platformCommissionReport.service");

function normalizeDate(dateInput = new Date()) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

async function runPlatformCommissionReconciliation(dateInput = new Date()) {
  const date = normalizeDate(dateInput);
  const from = `${date}T00:00:00.000Z`;
  const to = `${date}T23:59:59.999Z`;

  const summary = await reportService.getCommissionReconciliation({ from, to });

  return ReconciliationReport.findOneAndUpdate(
    { date, type: "PLATFORM_COMMISSION", scope: "SYSTEM" },
    {
      $set: {
        date,
        type: "PLATFORM_COMMISSION",
        scope: "SYSTEM",
        settlementCommission: summary.settlementCommission,
        ledgerCommission: summary.ledgerCommission,
        merchantDirectCount: summary.merchantDirectCount,
        ledgerEntryCount: summary.ledgerEntries,
        difference: summary.difference,
        status: summary.status,
        metadata: {
          settlementCount: summary.settlementCount,
          source: "platform_commission_report",
        },
      },
    },
    { upsert: true, returnDocument: "after" }
  );
}

async function listPlatformCommissionReconciliations(limit = 30) {
  return ReconciliationReport.find({
    type: "PLATFORM_COMMISSION",
    scope: "SYSTEM",
  })
    .sort({ date: -1, createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 30, 1), 100))
    .lean();
}

module.exports = {
  runPlatformCommissionReconciliation,
  listPlatformCommissionReconciliations,
};
