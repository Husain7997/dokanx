const mongoose = require("mongoose");

async function financialTransaction(fn) {

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

module.exports = { financialTransaction };