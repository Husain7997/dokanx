function asUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function validateBackupJobBody(body = {}) {
  const errors = [];
  const type = asUpper(body.backupType);
  if (!["INCREMENTAL", "FULL", "WEEKLY", "MONTHLY"].includes(type)) {
    errors.push("backupType is invalid");
  }
  if (body.scope && !["SYSTEM", "SHOP"].includes(asUpper(body.scope))) {
    errors.push("scope is invalid");
  }
  if (body.retentionDays !== undefined) {
    const retention = Number(body.retentionDays);
    if (!Number.isFinite(retention) || retention < 1) errors.push("retentionDays must be >= 1");
  }
  if (body.scheduledFor && Number.isNaN(new Date(body.scheduledFor).getTime())) {
    errors.push("scheduledFor must be a valid date");
  }
  return { valid: errors.length === 0, errors };
}

function validateJobStatusBody(body = {}) {
  const status = asUpper(body.status);
  const allowed = ["SCHEDULED", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"];
  return {
    valid: allowed.includes(status),
    errors: allowed.includes(status) ? [] : ["status is invalid"],
  };
}

function validateRestoreRequestBody(body = {}) {
  const errors = [];
  if (!body.targetTimestamp || Number.isNaN(new Date(body.targetTimestamp).getTime())) {
    errors.push("targetTimestamp must be a valid date");
  }
  if (body.scope && !["SYSTEM", "SHOP"].includes(asUpper(body.scope))) {
    errors.push("scope is invalid");
  }
  return { valid: errors.length === 0, errors };
}

function validateRestoreStatusBody(body = {}) {
  const status = asUpper(body.status);
  const allowed = ["APPROVED", "RUNNING", "COMPLETED", "FAILED", "REJECTED"];
  return {
    valid: allowed.includes(status),
    errors: allowed.includes(status) ? [] : ["status is invalid"],
  };
}

function validateIdParam(params = {}) {
  const id = String(params.jobId || params.requestId || "").trim();
  return {
    valid: Boolean(id),
    errors: id ? [] : ["id is required"],
  };
}

module.exports = {
  validateBackupJobBody,
  validateJobStatusBody,
  validateRestoreRequestBody,
  validateRestoreStatusBody,
  validateIdParam,
};
