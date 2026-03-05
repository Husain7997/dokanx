const mongoose = require("mongoose");
const Ledger = require("@/modules/ledger/ledger.model");
const { lockManager, eventBus, redisClient } =
  require("@/core/infrastructure");

/**
 * REAL DOUBLE ENTRY FINANCIAL ENGINE
 */
async function execute({
  tenantId,
  idempotencyKey,
  entries
}) {
  if (!tenantId || !idempotencyKey || !Array.isArray(entries)) {
    throw new Error(
      "Invalid financial execute payload: tenantId, idempotencyKey and entries[] are required"
    );
  }

  const lockKey = `${tenantId}:${idempotencyKey}`;
  const acquired = await lockManager.acquire(lockKey);

  if (!acquired) {
    throw new Error("Transaction locked");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    /* 1️⃣ IDEMPOTENCY CHECK */
    const existing = await redisClient.get(`idem:${lockKey}`);
    if (existing) {
      await session.abortTransaction();
      session.endSession();
      return JSON.parse(existing);
    }

    /* 2️⃣ DOUBLE ENTRY VALIDATION */
    const totalDebit = entries
      .filter(e => e.type === "debit")
      .reduce((sum, e) => sum + e.amount, 0);

    const totalCredit = entries
      .filter(e => e.type === "credit")
      .reduce((sum, e) => sum + e.amount, 0);

    if (totalDebit !== totalCredit) {
      throw new Error("Double-entry imbalance detected");
    }
if (totalDebit <= 0 || totalCredit <= 0) {
  throw new Error("Invalid transaction amount");
}
    /* 3️⃣ PERSIST LEDGER ENTRIES (ATOMIC) */
    const ledgerDocs = entries.map(entry => ({
      shopId: tenantId,
      amount: entry.amount,
      type: entry.type,
      referenceId: idempotencyKey,
      meta: entry.meta || {}
    }));

    await Ledger.insertMany(ledgerDocs, { session });

    /* 4️⃣ COMMIT TRANSACTION */
    await session.commitTransaction();
    session.endSession();

    const result = {
      success: true,
      transactionId: idempotencyKey
    };

    /* 5️⃣ STORE IDEMPOTENCY RESULT */
    await redisClient.set(
      `idem:${lockKey}`,
      JSON.stringify(result),
      "EX",
      3600
    );

    /* 6️⃣ EMIT EVENT (AFTER COMMIT) */
    eventBus.emit("LEDGER_TRANSACTION_COMPLETED", {
      tenantId,
      idempotencyKey
    });

    return result;

  } catch (err) {

    await session.abortTransaction();
    session.endSession();
    throw err;

  } finally {
    await lockManager.release(lockKey);
  }
}

module.exports = {
  execute
};
