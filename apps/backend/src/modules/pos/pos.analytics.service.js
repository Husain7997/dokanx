function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function buildPOSRegisterReport({ sessions = [], queueItems = [], sales = [] }) {
  const totalSales = sales.reduce((sum, row) => sum + toNumber(row.totalAmount, 0), 0);
  const syncedQueueItems = queueItems.filter(row => asUpper(row.status) === "SYNCED").length;
  const failedQueueItems = queueItems.filter(row => asUpper(row.status) === "FAILED").length;

  return {
    openedSessions: sessions.filter(row => asUpper(row.status) === "OPEN").length,
    syncingSessions: sessions.filter(row => asUpper(row.status) === "SYNCING").length,
    closedSessions: sessions.filter(row => asUpper(row.status) === "CLOSED").length,
    totalSales: Number(totalSales.toFixed(2)),
    saleCount: sales.length,
    offlineQueue: {
      total: queueItems.length,
      synced: syncedQueueItems,
      failed: failedQueueItems,
      pending: queueItems.filter(row => asUpper(row.status) === "PENDING").length,
    },
  };
}

function buildCashierPerformanceReport({ sessions = [], sales = [] }) {
  const report = {};

  for (const session of sessions) {
    const cashierId = String(session.openedBy || "UNASSIGNED");
    report[cashierId] = report[cashierId] || {
      cashierId,
      sessionsOpened: 0,
      sessionsClosed: 0,
      salesCount: 0,
      salesAmount: 0,
    };
    report[cashierId].sessionsOpened += 1;
    if (asUpper(session.status) === "CLOSED") {
      report[cashierId].sessionsClosed += 1;
    }
  }

  for (const sale of sales) {
    const cashierId = String(sale.cashierId || sale.openedBy || "UNASSIGNED");
    report[cashierId] = report[cashierId] || {
      cashierId,
      sessionsOpened: 0,
      sessionsClosed: 0,
      salesCount: 0,
      salesAmount: 0,
    };
    report[cashierId].salesCount += 1;
    report[cashierId].salesAmount += toNumber(sale.totalAmount, 0);
  }

  return Object.values(report).map(row => ({
    ...row,
    salesAmount: Number(row.salesAmount.toFixed(2)),
    averageTicket: row.salesCount
      ? Number((row.salesAmount / row.salesCount).toFixed(2))
      : 0,
  }));
}

function verifyOfflineQueueIntegrity(queueItems = []) {
  const mutationMap = new Map();
  const issues = [];

  for (const item of queueItems) {
    const key = `${String(item.shopId || "")}:${String(item.terminalId || "")}:${String(item.clientMutationId || "")}`;
    if (mutationMap.has(key)) {
      issues.push({
        type: "DUPLICATE_MUTATION",
        key,
        severity: "HIGH",
      });
    } else {
      mutationMap.set(key, item);
    }

    if (asUpper(item.status) === "PROCESSING" && toNumber(item.attemptCount, 0) >= 3) {
      issues.push({
        type: "STUCK_PROCESSING",
        key,
        severity: "HIGH",
      });
    }

    if (asUpper(item.status) === "FAILED" && !String(item.lastError || "").trim()) {
      issues.push({
        type: "FAILED_WITHOUT_ERROR",
        key,
        severity: "MEDIUM",
      });
    }
  }

  return {
    ok: issues.length === 0,
    issueCount: issues.length,
    issues,
  };
}

function resolveSyncConflict({ localPayload = {}, remoteOrder = null }) {
  const localUpdatedAt = localPayload.updatedAt ? new Date(localPayload.updatedAt).getTime() : 0;
  const remoteUpdatedAt = remoteOrder?.updatedAt ? new Date(remoteOrder.updatedAt).getTime() : 0;

  if (!remoteOrder) {
    return {
      resolution: "APPLY_LOCAL",
      reason: "Remote order missing",
    };
  }

  if (localUpdatedAt >= remoteUpdatedAt) {
    return {
      resolution: "APPLY_LOCAL",
      reason: "Local POS payload is newer or equal",
    };
  }

  return {
    resolution: "KEEP_REMOTE",
    reason: "Remote order is newer",
  };
}

module.exports = {
  buildPOSRegisterReport,
  buildCashierPerformanceReport,
  verifyOfflineQueueIntegrity,
  resolveSyncConflict,
};
