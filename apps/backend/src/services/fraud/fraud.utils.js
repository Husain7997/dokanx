const crypto = require("crypto");

const LEVELS = {
  SAFE: "safe",
  MEDIUM: "medium",
  HIGH: "high",
};

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function deriveLevel(score) {
  if (score >= 61) return LEVELS.HIGH;
  if (score >= 31) return LEVELS.MEDIUM;
  return LEVELS.SAFE;
}

function deriveStatus(level) {
  if (level === LEVELS.HIGH) return "REVIEW_REQUIRED";
  if (level === LEVELS.MEDIUM) return "OPEN";
  return "CLEARED";
}

function buildDeviceFingerprint(context = {}) {
  const raw = context.deviceFingerprint || `${context.ip || ""}|${context.userAgent || ""}`;
  return crypto.createHash("sha1").update(String(raw)).digest("hex").slice(0, 16);
}

function normalizeStoredFingerprint(value) {
  if (!value) return null;
  const raw = String(value);
  return raw.length === 16 ? raw : buildDeviceFingerprint({ deviceFingerprint: raw });
}

function hoursBetween(date) {
  if (!date) return Number.POSITIVE_INFINITY;
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);
}

function countRecent(rows, minutes, selector) {
  const boundary = Date.now() - minutes * 60 * 1000;
  return rows.filter((row) => {
    const raw = selector(row);
    if (!raw) return false;
    return new Date(raw).getTime() >= boundary;
  }).length;
}

function appendSignal(signals, condition, payload) {
  if (!condition) return 0;
  signals.push(payload);
  return payload.weight;
}

function buildSummary(level, signals) {
  if (!signals.length) return "No significant fraud indicators detected.";
  const headline = signals
    .slice()
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 3)
    .map((signal) => signal.label)
    .join(", ");
  return `${level.toUpperCase()} risk triggered by ${headline}.`;
}

module.exports = {
  LEVELS,
  clampScore,
  deriveLevel,
  deriveStatus,
  buildDeviceFingerprint,
  normalizeStoredFingerprint,
  hoursBetween,
  countRecent,
  appendSignal,
  buildSummary,
};
