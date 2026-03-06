const mongoose = require("mongoose");
const Ledger = require("@/modules/ledger/ledger.model");
const { lockManager, eventBus, redisClient } = require("@/core/infrastructure");

async function execute({ tenantId, idempotencyKey, entries }) {
  if (!tenantId || !idempotencyKey || !Array.isArray(entries)) {
    throw new Error(
      "Invalid financial execute payload: tenantId, idempotencyKey and entries[] are required"
    );
  }

  const lockKey = `${tenantId}:${idempotencyKey}`;
  const acquired = await lockManager.acquire(lockKey);
  if (!acquired) throw new Error("Transaction locked");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existing = await redisClient.get(`idem:${lockKey}`);
    if (existing) {
      if (typeof session.inTransaction === "function" && session.inTransaction()) {
        await session.abortTransaction();
      }
      return JSON.parse(existing);
    }

    const totalDebit = entries
      .filter((e) => e.type === "debit")
      .reduce((sum, e) => sum + e.amount, 0);

    const totalCredit = entries
      .filter((e) => e.type === "credit")
      .reduce((sum, e) => sum + e.amount, 0);

    if (totalDebit !== totalCredit) {
      throw new Error("Double-entry imbalance detected");
    }
    if (totalDebit <= 0 || totalCredit <= 0) {
      throw new Error("Invalid transaction amount");
    }

    const ledgerDocs = entries.map((entry) => ({
      shopId: tenantId,
      amount: entry.amount,
      type: entry.type,
      referenceId: idempotencyKey,
      meta: entry.meta || {},
    }));

    await Ledger.insertMany(ledgerDocs, { session });
    await session.commitTransaction();

    const result = {
      success: true,
      transactionId: idempotencyKey,
    };

    await redisClient.set(`idem:${lockKey}`, JSON.stringify(result), "EX", 3600);

    eventBus.emit("LEDGER_TRANSACTION_COMPLETED", {
      tenantId,
      idempotencyKey,
    });

    return result;
  } catch (err) {
    if (typeof session.inTransaction === "function" && session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    session.endSession();
    await lockManager.release(lockKey);
  }
}

module.exports = { execute };
