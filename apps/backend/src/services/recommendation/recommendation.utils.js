const mongoose = require("mongoose");

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;

const WINDOWS = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
};

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function normalizeLimit(limit) {
  const parsed = Number(limit || DEFAULT_LIMIT);
  if (Number.isNaN(parsed)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(parsed, MAX_LIMIT));
}

function parseLocation(input) {
  if (!input || typeof input !== "string") return null;
  const [lat, lng] = input.split(",").map((value) => Number(value.trim()));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function uniqueIds(ids) {
  const seen = new Set();
  const result = [];
  ids.forEach((id) => {
    const key = String(id);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(id);
    }
  });
  return result;
}

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  WINDOWS,
  isValidObjectId,
  normalizeLimit,
  parseLocation,
  uniqueIds,
};
