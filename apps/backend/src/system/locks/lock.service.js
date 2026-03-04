const {
  acquireLock,
  releaseLock,
} = require("./reconcile.lock");

async function withLock(name, fn) {

  const locked = await acquireLock(name);

  if (!locked)
    throw new Error("LOCK_NOT_ACQUIRED");

  try {
    return await fn();
  } finally {
    await releaseLock(name);
  }
}

module.exports = { withLock };