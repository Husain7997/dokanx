const transactionManager = require('./transaction.manager');

/**
 * Execute logic inside MongoDB transaction
 */

async function withTransaction(handler, options = {}) {

  const { retries = 3 } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {

    const session = await transactionManager.start();

    try {

      const result = await handler(session);

      await transactionManager.commit(session);

      return result;

    } catch (err) {

      await transactionManager.rollback(session);

      // Retry transient transaction error
      if (
        attempt < retries &&
        err.errorLabels &&
        err.errorLabels.includes('TransientTransactionError')
      ) {
        continue;
      }

      throw err;
    }
  }
}

module.exports = withTransaction;