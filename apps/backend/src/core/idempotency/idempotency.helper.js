const {
  failExecution,
  findExisting,
  reserveExecution,
  saveResult,
  waitForCompletion,
} = require("./idempotency.service");

async function runOnce(key, handler, options = {}) {
  const existing = await findExisting(key);
  if (existing) return existing.response;

  const reservation = await reserveExecution({
    key,
    scope: options.scope || "worker",
    route: options.route || "worker",
    requestHash: options.requestHash || key,
    ttlMs: options.ttlMs,
  });
  if (!reservation.acquired) {
    return waitForCompletion(key, {
      timeoutMs: options.timeoutMs || 10000,
      intervalMs: options.intervalMs || 100,
    });
  }

  try {
    const result = await handler();

    await saveResult({
      key,
      route: options.route || "worker",
      requestHash: options.requestHash || key,
      response: result,
      statusCode: options.statusCode || 200,
      shop: options.shop || null,
    });

    return result;
  } catch (error) {
    await failExecution({ key, error });
    throw error;
  }
}

module.exports = {
  runOnce,
};
