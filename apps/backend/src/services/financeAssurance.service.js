const mongoose = require("mongoose");
const Ledger = require("@/modules/ledger/ledger.model");
const ShopWallet = require("@/models/ShopWallet");
const Settlement = require("@/models/settlement.model");
const Payout = require("@/models/payout.model");
const PayoutRetry = require("@/models/PayoutRetry");
const ReconciliationReport = require("@/models/ReconciliationReport");
const FinanceException = require("@/models/FinanceException");

const DEFAULT_THRESHOLDS = {
  settlementDriftAmount: 1,
  walletDriftAmount: 1,
  payoutFailureAttempts: 3,
  idempotencyReplayCount: 1,
};

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toObjectId(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(String(value))) return null;
  return new mongoose.Types.ObjectId(String(value));
}

function formatDateKey(date = new Date()) {
  return new Date(date).toISOString().slice(0, 10);
}

function normalizeThresholds(thresholds = {}) {
  return {
    settlementDriftAmount: Math.max(
      0,
      toNumber(thresholds.settlementDriftAmount, DEFAULT_THRESHOLDS.settlementDriftAmount)
    ),
    walletDriftAmount: Math.max(
      0,
      toNumber(thresholds.walletDriftAmount, DEFAULT_THRESHOLDS.walletDriftAmount)
    ),
    payoutFailureAttempts: Math.max(
      1,
      Math.floor(toNumber(thresholds.payoutFailureAttempts, DEFAULT_THRESHOLDS.payoutFailureAttempts))
    ),
    idempotencyReplayCount: Math.max(
      1,
      Math.floor(toNumber(thresholds.idempotencyReplayCount, DEFAULT_THRESHOLDS.idempotencyReplayCount))
    ),
  };
}

function getLedgerNetAmount(entries = []) {
  return entries.reduce((sum, entry) => {
    const amount = toNumber(entry.amount, 0);
    const type = String(entry.type || entry.direction || "").trim().toUpperCase();
    if (type === "CREDIT") return sum + amount;
    if (type === "DEBIT") return sum - amount;
    return sum;
  }, 0);
}

function getIdempotencyReplayRisks(entries = []) {
  const counts = new Map();
  for (const entry of entries) {
    const key = String(entry.referenceId || "").trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([referenceId, count]) => ({
      referenceId,
      count,
    }));
}

function getDoubleLedgerRisks(entries = []) {
  const counts = new Map();
  for (const entry of entries) {
    const ref = String(entry.referenceId || "").trim();
    const type = String(entry.type || "").trim().toUpperCase();
    if (!ref || !type) continue;
    const key = `${ref}:${type}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([key, count]) => {
      const [referenceId, type] = key.split(":");
      return { referenceId, type, count };
    });
}

function detectSettlementAnomalies({ settlements = [], thresholds = {} }) {
  const safeThresholds = normalizeThresholds(thresholds);
  return settlements
    .map(row => {
      const total = toNumber(row.totalAmount, 0);
      const commission = toNumber(row.commission, 0);
      const taxAmount = toNumber(row.taxAmount, 0);
      const expectedNet = total - commission - taxAmount;
      const recordedNet = toNumber(row.netAmount, 0);
      const drift = Number((recordedNet - expectedNet).toFixed(2));

      if (Math.abs(drift) < safeThresholds.settlementDriftAmount) {
        return null;
      }

      return {
        settlementId: String(row._id || ""),
        shopId: row.shopId || null,
        type: "SETTLEMENT_DRIFT",
        severity: Math.abs(drift) >= safeThresholds.settlementDriftAmount * 5 ? "CRITICAL" : "HIGH",
        driftAmount: drift,
        expectedNet,
        recordedNet,
      };
    })
    .filter(Boolean);
}

function detectWalletDrift({ wallets = [], ledgerEntries = [], thresholds = {} }) {
  const safeThresholds = normalizeThresholds(thresholds);
  const ledgerByShop = ledgerEntries.reduce((acc, entry) => {
    const shopId = String(entry.shopId || "");
    if (!shopId) return acc;
    acc[shopId] = acc[shopId] || [];
    acc[shopId].push(entry);
    return acc;
  }, {});

  return wallets
    .map(wallet => {
      const shopId = String(wallet.shopId || "");
      const ledgerBalance = getLedgerNetAmount(ledgerByShop[shopId] || []);
      const walletBalance = toNumber(wallet.balance, 0);
      const drift = Number((ledgerBalance - walletBalance).toFixed(2));
      if (Math.abs(drift) < safeThresholds.walletDriftAmount) {
        return null;
      }

      return {
        shopId,
        type: "WALLET_DRIFT",
        severity: Math.abs(drift) >= safeThresholds.walletDriftAmount * 5 ? "CRITICAL" : "HIGH",
        ledgerBalance,
        walletBalance,
        driftAmount: drift,
      };
    })
    .filter(Boolean);
}

async function upsertFinanceException({
  type,
  severity,
  summary,
  shopId = null,
  scopeType = "SYSTEM",
  scopeRef = "",
  metadata = {},
}) {
  const query = {
    type,
    status: { $ne: "RESOLVED" },
    scopeRef: String(scopeRef || ""),
    shopId: shopId || null,
  };

  const update = {
    $set: {
      severity,
      summary,
      metadata,
      scopeType,
      detectedAt: new Date(),
    },
    $setOnInsert: {
      timeline: [
        {
          action: "FLAGGED",
          note: summary,
          metadata,
          createdAt: new Date(),
        },
      ],
    },
  };

  return FinanceException.findOneAndUpdate(query, update, {
    upsert: true,
    returnDocument: "after",
    setDefaultsOnInsert: true,
  });
}

async function verifyReconciliation({
  date = new Date(),
  shopId = null,
  thresholds = {},
  dependencies = {},
} = {}) {
  const safeThresholds = normalizeThresholds(thresholds);
  const normalizedShopId = toObjectId(shopId);
  const dayKey = formatDateKey(date);

  const ledgerEntries =
    dependencies.ledgerEntries ||
    (await Ledger.find(normalizedShopId ? { shopId: normalizedShopId } : {})
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean());
  const wallets =
    dependencies.wallets ||
    (await ShopWallet.find(normalizedShopId ? { shopId: normalizedShopId } : {}).lean());
  const settlements =
    dependencies.settlements ||
    (await Settlement.find(normalizedShopId ? { shopId: normalizedShopId } : {})
      .sort({ createdAt: -1 })
      .limit(2000)
      .lean());
  const payoutRetries =
    dependencies.payoutRetries ||
    (await PayoutRetry.find({}).sort({ updatedAt: -1 }).limit(1000).lean());

  const ledgerBalance = getLedgerNetAmount(ledgerEntries);
  const walletBalance = wallets.reduce((sum, wallet) => sum + toNumber(wallet.balance, 0), 0);
  const difference = Number((ledgerBalance - walletBalance).toFixed(2));
  const walletDrifts = detectWalletDrift({ wallets, ledgerEntries, thresholds: safeThresholds });
  const settlementAnomalies = detectSettlementAnomalies({ settlements, thresholds: safeThresholds });
  const idempotencyRisks = getIdempotencyReplayRisks(ledgerEntries)
    .filter(item => item.count > safeThresholds.idempotencyReplayCount);
  const doubleLedgerRisks = getDoubleLedgerRisks(ledgerEntries);
  const payoutFailures = payoutRetries.filter(
    row =>
      String(row.status || "").toUpperCase() === "FAILED" ||
      toNumber(row.attempts, 0) >= safeThresholds.payoutFailureAttempts
  );

  const reportPayload = {
    date: dayKey,
    type: "WALLET_LEDGER",
    scope: normalizedShopId ? "SHOP" : "SYSTEM",
    scopeRef: normalizedShopId,
    ledgerBalance,
    walletBalance,
    difference,
    status:
      difference === 0 &&
      walletDrifts.length === 0 &&
      settlementAnomalies.length === 0 &&
      idempotencyRisks.length === 0 &&
      doubleLedgerRisks.length === 0 &&
      payoutFailures.length === 0
        ? "MATCHED"
        : "MISMATCH",
    metadata: {
      walletDrifts,
      settlementAnomalies,
      payoutFailures,
      idempotencyRisks,
      doubleLedgerRisks,
      thresholds: safeThresholds,
    },
  };

  const report =
    dependencies.persist === false
      ? reportPayload
      : await ReconciliationReport.findOneAndUpdate(
          {
            date: dayKey,
            type: reportPayload.type,
            scope: reportPayload.scope,
            scopeRef: reportPayload.scopeRef,
          },
          { $set: reportPayload },
          { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
        );

  if (dependencies.persist !== false) {
    for (const anomaly of settlementAnomalies) {
      await upsertFinanceException({
        type: anomaly.type,
        severity: anomaly.severity,
        summary: `Settlement drift detected for ${anomaly.settlementId}`,
        shopId: anomaly.shopId || null,
        scopeType: "SETTLEMENT",
        scopeRef: anomaly.settlementId,
        metadata: anomaly,
      });
    }

    for (const drift of walletDrifts) {
      await upsertFinanceException({
        type: drift.type,
        severity: drift.severity,
        summary: `Wallet drift detected for shop ${drift.shopId}`,
        shopId: drift.shopId || null,
        scopeType: "WALLET",
        scopeRef: drift.shopId,
        metadata: drift,
      });
    }

    for (const payoutFailure of payoutFailures) {
      await upsertFinanceException({
        type: "PAYOUT_FAILURE",
        severity: "HIGH",
        summary: `Payout retry exhausted for ${String(payoutFailure.payoutId || "")}`,
        scopeType: "PAYOUT",
        scopeRef: String(payoutFailure.payoutId || ""),
        metadata: payoutFailure,
      });
    }

    for (const replay of idempotencyRisks) {
      await upsertFinanceException({
        type: "IDEMPOTENCY_REPLAY",
        severity: "HIGH",
        summary: `Repeated ledger reference detected for ${replay.referenceId}`,
        scopeType: "SYSTEM",
        scopeRef: replay.referenceId,
        metadata: replay,
      });
    }

    for (const risk of doubleLedgerRisks) {
      await upsertFinanceException({
        type: "DOUBLE_LEDGER_RISK",
        severity: "CRITICAL",
        summary: `Duplicate ${risk.type} ledger entries detected for ${risk.referenceId}`,
        scopeType: "SYSTEM",
        scopeRef: risk.referenceId,
        metadata: risk,
      });
    }
  }

  return {
    report,
    summary: {
      walletDriftCount: walletDrifts.length,
      settlementAnomalyCount: settlementAnomalies.length,
      payoutFailureCount: payoutFailures.length,
      idempotencyReplayCount: idempotencyRisks.length,
      doubleLedgerRiskCount: doubleLedgerRisks.length,
    },
  };
}

async function recoverFailedPayout({
  payoutId,
  actorId = null,
  gatewayExecutor = null,
}) {
  const payout = await Payout.findById(payoutId);
  if (!payout) {
    const err = new Error("Payout not found");
    err.statusCode = 404;
    throw err;
  }

  let retry = await PayoutRetry.findOne({ payoutId });
  if (!retry) {
    retry = await PayoutRetry.create({ payoutId, attempts: 0, status: "PENDING" });
  }

  if (String(payout.status || "").toUpperCase() === "SUCCESS") {
    retry.status = "SUCCESS";
    retry.updatedAt = new Date();
    await retry.save();
    return { payout, retry, recovered: false, duplicate: true };
  }

  retry.attempts = toNumber(retry.attempts, 0) + 1;
  retry.status = "PENDING";
  retry.updatedAt = new Date();
  await retry.save();

  try {
    if (typeof gatewayExecutor === "function") {
      await gatewayExecutor(payout);
    }

    payout.status = "SUCCESS";
    payout.executedAt = new Date();
    await payout.save();

    retry.status = "SUCCESS";
    retry.lastError = "";
    retry.updatedAt = new Date();
    await retry.save();

    await FinanceException.updateMany(
      {
        type: "PAYOUT_FAILURE",
        scopeRef: String(payoutId),
        status: { $ne: "RESOLVED" },
      },
      {
        $set: {
          status: "RESOLVED",
          resolvedAt: new Date(),
          assignedTo: actorId || null,
        },
        $push: {
          timeline: {
            action: "RESOLVED",
            note: "Payout recovered successfully",
            actorId,
            createdAt: new Date(),
          },
        },
      }
    );

    return { payout, retry, recovered: true, duplicate: false };
  } catch (err) {
    payout.status = "FAILED";
    await payout.save();

    retry.status = "FAILED";
    retry.lastError = String(err.message || "Payout recovery failed");
    retry.updatedAt = new Date();
    await retry.save();

    await upsertFinanceException({
      type: "PAYOUT_FAILURE",
      severity: retry.attempts >= DEFAULT_THRESHOLDS.payoutFailureAttempts ? "CRITICAL" : "HIGH",
      summary: `Payout recovery failed for ${String(payoutId)}`,
      shopId: payout.shopId || null,
      scopeType: "PAYOUT",
      scopeRef: String(payoutId),
      metadata: {
        attempts: retry.attempts,
        lastError: retry.lastError,
      },
    });

    throw err;
  }
}

async function getFinanceAdminDashboard({ shopId = null, days = 7 } = {}) {
  const safeDays = Math.max(1, Math.min(Number(days) || 7, 90));
  const normalizedShopId = toObjectId(shopId);
  const from = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
  const reportQuery = {
    createdAt: { $gte: from },
    ...(normalizedShopId ? { scope: "SHOP", scopeRef: normalizedShopId } : {}),
  };
  const exceptionQuery = {
    detectedAt: { $gte: from },
    ...(normalizedShopId ? { shopId: normalizedShopId } : {}),
  };

  const [reports, exceptionAgg, openExceptions, payoutRetryAgg] = await Promise.all([
    ReconciliationReport.find(reportQuery).sort({ createdAt: -1 }).limit(20).lean(),
    FinanceException.aggregate([
      { $match: exceptionQuery },
      {
        $group: {
          _id: { status: "$status", severity: "$severity" },
          count: { $sum: 1 },
        },
      },
    ]),
    FinanceException.find({
      ...exceptionQuery,
      status: { $ne: "RESOLVED" },
    })
      .sort({ detectedAt: -1 })
      .limit(20)
      .lean(),
    PayoutRetry.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          maxAttempts: { $max: "$attempts" },
        },
      },
    ]),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    scope: normalizedShopId ? "SHOP" : "SYSTEM",
    shopId: normalizedShopId ? String(normalizedShopId) : null,
    reports,
    exceptionSummary: exceptionAgg,
    openExceptions,
    payoutRecovery: payoutRetryAgg,
  };
}

async function listFinanceExceptions({ shopId = null, status = null, limit = 50 } = {}) {
  const query = {};
  const normalizedShopId = toObjectId(shopId);
  if (normalizedShopId) query.shopId = normalizedShopId;
  if (status) query.status = String(status).trim().toUpperCase();

  return FinanceException.find(query)
    .sort({ detectedAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 50, 1), 200))
    .lean();
}

async function updateFinanceExceptionStatus({
  exceptionId,
  status,
  actorId = null,
  note = "",
}) {
  const nextStatus = String(status || "").trim().toUpperCase();
  const row = await FinanceException.findById(exceptionId);
  if (!row) {
    const err = new Error("Finance exception not found");
    err.statusCode = 404;
    throw err;
  }

  row.status = nextStatus;
  if (nextStatus === "RESOLVED") {
    row.resolvedAt = new Date();
  }
  row.assignedTo = actorId || row.assignedTo || null;
  row.timeline.push({
    action: nextStatus,
    note: String(note || "").trim(),
    actorId,
    createdAt: new Date(),
  });
  await row.save();
  return row;
}

module.exports = {
  DEFAULT_THRESHOLDS,
  detectSettlementAnomalies,
  detectWalletDrift,
  verifyReconciliation,
  recoverFailedPayout,
  getFinanceAdminDashboard,
  listFinanceExceptions,
  updateFinanceExceptionStatus,
  _internals: {
    formatDateKey,
    getLedgerNetAmount,
    getIdempotencyReplayRisks,
    getDoubleLedgerRisks,
    normalizeThresholds,
  },
};
