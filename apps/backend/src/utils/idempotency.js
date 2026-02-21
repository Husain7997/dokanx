const crypto = require('crypto');
const IdempotencyKey = require('../models/IdempotencyKey');

async function ensureIdempotent(key, scope) {
  if (!key) {
    throw new Error('Idempotency key missing');
  }

  const hash = crypto
    .createHash('sha256')
    .update(`${scope}:${key}`)
    .digest('hex');

  const exists = await IdempotencyKey.findOne({ hash });
  if (exists) {
    const err = new Error('Duplicate request');
    err.status = 409;
    throw err;
  }

  await IdempotencyKey.create({
    hash,
    scope,
    createdAt: new Date(),
  });
}

module.exports = {
  ensureIdempotent,
};
