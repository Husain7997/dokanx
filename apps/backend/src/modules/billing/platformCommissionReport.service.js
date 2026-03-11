const Ledger = require("@/modules/ledger/ledger.model");
const Settlement = require("@/models/settlement.model");

function toDateRange({ from, to }) {
  const range = {};
  if (from) {
    const date = new Date(from);
    if (!Number.isNaN(date.getTime())) range.$gte = date;
  }
  if (to) {
    const date = new Date(to);
    if (!Number.isNaN(date.getTime())) range.$lte = date;
  }
  return range;
}

async function getCommissionReconciliation({ from = null, to = null } = {}) {
  const createdAt = toDateRange({ from, to });
  const settlementMatch = Object.keys(createdAt).length ? { createdAt } : {};
  const ledgerMatch = {
    "meta.reason": "platform_commission_credit",
    ...(Object.keys(createdAt).length ? { createdAt } : {}),
  };

  const [settlementAgg] = await Settlement.aggregate([
    { $match: settlementMatch },
    {
      $group: {
        _id: null,
        settlementCommission: { $sum: "$commission" },
        settlementCount: { $sum: 1 },
        merchantDirectCount: {
          $sum: {
            $cond: [{ $eq: ["$settlementRuleSnapshot.routingDestination", "MERCHANT_DIRECT"] }, 1, 0],
          },
        },
      },
    },
  ]);

  const [ledgerAgg] = await Ledger.aggregate([
    { $match: ledgerMatch },
    {
      $group: {
        _id: null,
        ledgerCommission: {
          $sum: {
            $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0],
          },
        },
        ledgerEntries: { $sum: 1 },
      },
    },
  ]);

  const settlementCommission = Number(settlementAgg?.settlementCommission || 0);
  const ledgerCommission = Number(ledgerAgg?.ledgerCommission || 0);

  return {
    settlementCommission,
    ledgerCommission,
    difference: settlementCommission - ledgerCommission,
    settlementCount: Number(settlementAgg?.settlementCount || 0),
    ledgerEntries: Number(ledgerAgg?.ledgerEntries || 0),
    merchantDirectCount: Number(settlementAgg?.merchantDirectCount || 0),
    status: settlementCommission === ledgerCommission ? "MATCHED" : "MISMATCH",
  };
}

async function listCommissionEntries({ from = null, to = null, limit = 100 } = {}) {
  const createdAt = toDateRange({ from, to });
  return Ledger.find({
    "meta.reason": "platform_commission_credit",
    ...(Object.keys(createdAt).length ? { createdAt } : {}),
  })
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 100, 1), 500))
    .lean();
}

async function buildCommissionExportRows({ from = null, to = null, limit = 1000 } = {}) {
  const entries = await listCommissionEntries({ from, to, limit });

  return entries.map(entry => ({
    createdAt: entry.createdAt,
    tenantId: entry.shopId,
    amount: entry.amount,
    type: entry.type,
    referenceId: entry.referenceId,
    sourceTenantId: entry.meta?.sourceTenantId || "",
    orderId: entry.meta?.orderId || "",
    attemptId: entry.meta?.attemptId || "",
    reason: entry.meta?.reason || "",
  }));
}

module.exports = {
  getCommissionReconciliation,
  listCommissionEntries,
  buildCommissionExportRows,
};
