const Idempotency =
  require("@/models/idempotency.model");

/**
 * Prevent duplicate execution
 */
async function ensureIdempotent(key, scope) {

  if (!key)
    throw new Error("IDEMPOTENCY_KEY_REQUIRED");

  const exists =
    await Idempotency.findOne({
      key,
      scope,
    });

  if (exists)
    throw new Error("DUPLICATE_REQUEST");

  await Idempotency.create({
    key,
    scope,
    createdAt: new Date(),
  });

  return true;
}

module.exports = {
  ensureIdempotent,
};