const { acquireLock } =
  require("../../system/locks/reconcile.lock");

async function withLock(name, fn) {

  const ok = await acquireLock(name);

  if (!ok) {
    console.log("Lock exists:", name);
    return;
  }

  return fn();
}

module.exports = { withLock };