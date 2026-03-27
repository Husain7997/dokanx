const crypto = require("crypto");
const Idempotency = require("./idempotency.model");

function hashRequest(body) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(body))
    .digest("hex");
}

async function findExisting(key) {
  return Idempotency.findOne({ key, status: "COMPLETED" });
}

async function reserveExecution({ key, scope = "global", route = "worker", requestHash = key, ttlMs = 24 * 60 * 60 * 1000 }) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);
  const result = await Idempotency.findOneAndUpdate(
    { key },
    {
      $setOnInsert: {
        key,
        scope,
        route,
        requestHash,
        status: "PENDING",
        expiresAt,
      },
    },
    {
      upsert: true,
      new: true,
      includeResultMetadata: true,
    }
  );

  return {
    doc: result.value || result,
    acquired: Boolean(result?.lastErrorObject?.upserted),
  };
}

async function waitForCompletion(key, { timeoutMs = 10000, intervalMs = 100 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const existing = await Idempotency.findOne({ key }).lean();
    if (existing?.status === "COMPLETED") return existing.response;
    if (existing?.status === "FAILED") {
      const error = new Error(existing.error || "Idempotent operation failed");
      error.statusCode = 409;
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  const error = new Error("Idempotent operation still pending");
  error.statusCode = 409;
  throw error;
}

async function saveResult({
  key,
  route,
  requestHash,
  response,
  statusCode,
  shop,
}) {
  return Idempotency.findOneAndUpdate(
    { key },
    {
      $set: {
        route,
        requestHash,
        response,
        statusCode,
        shop,
        status: "COMPLETED",
        error: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    },
    { new: true, upsert: true }
  );
}

async function failExecution({ key, error }) {
  return Idempotency.findOneAndUpdate(
    { key },
    {
      $set: {
        status: "FAILED",
        error: String(error?.message || error || "Unknown error"),
      },
    },
    { new: true }
  );
}

module.exports = {
  failExecution,
  hashRequest,
  findExisting,
  reserveExecution,
  saveResult,
  waitForCompletion,
};
