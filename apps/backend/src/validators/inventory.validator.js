function validateLowStockAlertQuery(query = {}) {
  const errors = [];

  if (query.threshold !== undefined) {
    const threshold = Number(query.threshold);
    if (!Number.isFinite(threshold) || threshold < 0) {
      errors.push("threshold must be a non-negative number");
    }
  }

  if (query.limit !== undefined) {
    const limit = Number(query.limit);
    if (!Number.isFinite(limit) || limit <= 0) {
      errors.push("limit must be greater than 0");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateLowStockAlertQuery,
};
