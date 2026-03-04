const mongoose = require("mongoose");

/**
 * SINGLE TRANSACTION ENTRY
 * No global memory store
 * Cluster safe
 */

async function withTransaction(fn) {

  const session = await mongoose.startSession();

  try {

    session.startTransaction();

    const result = await fn(session);

    await session.commitTransaction();

    return result;

  } catch (err) {

    await session.abortTransaction();
    throw err;

  } finally {

    session.endSession();
  }
}

module.exports = {
  withTransaction,
};