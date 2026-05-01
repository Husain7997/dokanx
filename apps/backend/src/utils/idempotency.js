const {
  reserveExecution,
  waitForCompletion,
} = require("@/core/idempotency/idempotency.service");

/**
 * Prevent duplicate execution
 */
async function ensureIdempotent(key, scope) {

  if (!key)
    throw new Error("IDEMPOTENCY_KEY_REQUIRED");

  const reservation = await reserveExecution({
    key,
    scope,
    route: scope || "utility",
    requestHash: key,
    ttlMs: 24 * 60 * 60 * 1000,
  });

  if (reservation.acquired) {
    return true;
  }

  const existing = reservation.doc;
  if (existing?.status === "COMPLETED") {
    throw new Error("DUPLICATE_REQUEST");
  }

  if (existing?.status === "FAILED") {
    throw new Error(existing.error || "DUPLICATE_REQUEST");
  }

  await waitForCompletion(key, { timeoutMs: 2000, intervalMs: 100 });
  throw new Error("DUPLICATE_REQUEST");

  return true;
}

module.exports = {
  ensureIdempotent,
};
