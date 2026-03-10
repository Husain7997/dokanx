function validateBusinessInsightsQuery(input) {
  const errors = [];

  if (input.days !== undefined) {
    const days = Number(input.days);
    if (!Number.isFinite(days) || days < 1 || days > 90) {
      errors.push("days must be between 1 and 90");
    }
  }

  if (input.limit !== undefined) {
    const limit = Number(input.limit);
    if (!Number.isFinite(limit) || limit < 1 || limit > 20) {
      errors.push("limit must be between 1 and 20");
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateBusinessInsightsQuery,
};
