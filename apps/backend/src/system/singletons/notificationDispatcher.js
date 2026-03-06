const notificationDispatcher = {
  async dispatch({ tenantId, userId, message, language }) {
    console.log(`[${tenantId}] -> ${userId}: (${language}) ${message}`);
  }
};

module.exports = { notificationDispatcher };