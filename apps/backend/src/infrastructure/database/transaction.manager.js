const { mongoose } = require('./mongo.client');

/**
 * Transaction Manager
 */

class TransactionManager {

  async start() {
    const session = await mongoose.startSession();

    session.startTransaction({
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
    });

    return session;
  }

  async commit(session) {
    await session.commitTransaction();
    session.endSession();
  }

  async rollback(session) {
    await session.abortTransaction();
    session.endSession();
  }
}

module.exports = new TransactionManager();