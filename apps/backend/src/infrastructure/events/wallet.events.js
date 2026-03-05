const { eventBus } =
  require("@/core/infrastructure");
const { applyTransaction } =
  require("@/services/wallet.projection");

let registered = false;
let pendingProjection = 0;
const idleWaiters = [];

function notifyIfIdle() {
  if (pendingProjection !== 0) return;
  while (idleWaiters.length) {
    const resolve = idleWaiters.pop();
    resolve();
  }
}

function registerWalletEvents() {

  if (registered) return;
  registered = true;

  eventBus.on(
  "LEDGER_TRANSACTION_COMPLETED",
  async ({ tenantId, idempotencyKey }) => {
    pendingProjection += 1;
    try {
      await applyTransaction(
        tenantId,
        idempotencyKey
      );
    } catch (err) {
      console.error("Wallet projection failed:", err.message);
    } finally {
      pendingProjection -= 1;
      notifyIfIdle();
    }
  }
);
}

function waitForWalletProjectionIdle() {
  if (pendingProjection === 0) {
    return Promise.resolve();
  }
  return new Promise(resolve => idleWaiters.push(resolve));
}

module.exports = {
  registerWalletEvents,
  waitForWalletProjectionIdle
};
