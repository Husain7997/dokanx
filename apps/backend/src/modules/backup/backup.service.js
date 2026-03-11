const BackupJob = require("./models/backupJob.model");
const RestoreRequest = require("./models/restoreRequest.model");

const DEFAULT_RETENTION_DAYS = {
  INCREMENTAL: 7,
  FULL: 30,
  WEEKLY: 90,
  MONTHLY: 365,
};

const DEFAULT_STRATEGY = [
  { backupType: "INCREMENTAL", frequency: "Every hour", retentionDays: 7 },
  { backupType: "FULL", frequency: "Daily 2 AM", retentionDays: 30 },
  { backupType: "WEEKLY", frequency: "Every Sunday", retentionDays: 90 },
  { backupType: "MONTHLY", frequency: "1st of month", retentionDays: 365 },
];

function asUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function toDate(value, fallback = new Date()) {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function buildExpiryDate(scheduledFor, retentionDays) {
  return new Date(new Date(scheduledFor).getTime() + Number(retentionDays || 0) * 24 * 60 * 60 * 1000);
}

function getDefaultStrategy() {
  return DEFAULT_STRATEGY.map(item => ({ ...item }));
}

function getDisasterRecoveryProfile() {
  return {
    multiRegion: true,
    pointInTimeRecovery: true,
    targets: {
      rtoMinutes: 60,
      rpoMinutes: 15,
    },
    failover: {
      primaryRegion: "primary-region",
      secondaryRegion: "secondary-region",
    },
  };
}

async function createBackupJob({ actorId, payload }) {
  const backupType = asUpper(payload.backupType);
  const scheduledFor = toDate(payload.scheduledFor, new Date());
  const retentionDays = Number(payload.retentionDays || DEFAULT_RETENTION_DAYS[backupType] || 7);

  return BackupJob.create({
    scope: asUpper(payload.scope || "SYSTEM"),
    scopeRef: payload.scopeRef || null,
    backupType,
    status: "SCHEDULED",
    storageTarget: String(payload.storageTarget || "primary-region").trim(),
    retentionDays,
    scheduledFor,
    expiresAt: buildExpiryDate(scheduledFor, retentionDays),
    snapshotLabel: String(payload.snapshotLabel || `${backupType}-${scheduledFor.toISOString()}`).trim(),
    metadata: payload.metadata || {},
    requestedBy: actorId || null,
    updatedBy: actorId || null,
  });
}

async function listBackupJobs(filters = {}) {
  const query = {};
  if (filters.backupType) query.backupType = asUpper(filters.backupType);
  if (filters.status) query.status = asUpper(filters.status);
  if (filters.scope) query.scope = asUpper(filters.scope);

  const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100);
  return BackupJob.find(query).sort({ scheduledFor: -1, createdAt: -1 }).limit(limit).lean();
}

async function updateBackupJobStatus({ jobId, actorId, status, note = "" }) {
  const row = await BackupJob.findById(jobId);
  if (!row) {
    const err = new Error("Backup job not found");
    err.statusCode = 404;
    throw err;
  }

  row.status = asUpper(status);
  row.updatedBy = actorId || null;
  row.metadata = {
    ...(row.metadata || {}),
    latestStatusNote: String(note || "").trim(),
  };
  if (row.status === "RUNNING" && !row.startedAt) row.startedAt = new Date();
  if (["COMPLETED", "FAILED", "CANCELLED"].includes(row.status)) row.completedAt = new Date();
  await row.save();
  return row;
}

async function createRestoreRequest({ actorId, payload }) {
  return RestoreRequest.create({
    scope: asUpper(payload.scope || "SYSTEM"),
    scopeRef: payload.scopeRef || null,
    targetTimestamp: toDate(payload.targetTimestamp),
    transactionLogReplay: payload.transactionLogReplay !== false,
    status: "REQUESTED",
    reason: String(payload.reason || "").trim(),
    requestedBy: actorId || null,
    updatedBy: actorId || null,
  });
}

async function listRestoreRequests(filters = {}) {
  const query = {};
  if (filters.status) query.status = asUpper(filters.status);
  if (filters.scope) query.scope = asUpper(filters.scope);
  const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100);
  return RestoreRequest.find(query).sort({ createdAt: -1 }).limit(limit).lean();
}

async function updateRestoreRequestStatus({ requestId, actorId, status, note = "" }) {
  const row = await RestoreRequest.findById(requestId);
  if (!row) {
    const err = new Error("Restore request not found");
    err.statusCode = 404;
    throw err;
  }

  row.status = asUpper(status);
  row.updatedBy = actorId || null;
  if (row.status === "APPROVED") row.approvedBy = actorId || null;
  row.reason = note ? String(note).trim() : row.reason;
  await row.save();
  return row;
}

module.exports = {
  _internals: {
    getDefaultStrategy,
    getDisasterRecoveryProfile,
    buildExpiryDate,
  },
  getBackupStrategy: getDefaultStrategy,
  getDisasterRecoveryProfile,
  createBackupJob,
  listBackupJobs,
  updateBackupJobStatus,
  createRestoreRequest,
  listRestoreRequests,
  updateRestoreRequestStatus,
};
