function validateOptimizationProfileBody(body = {}) {
  const errors = [];
  if (body.weights && typeof body.weights !== "object") {
    errors.push("weights must be an object");
  }
  return { valid: errors.length === 0, errors };
}

function validateProviderRecommendationBody(body = {}) {
  const errors = [];
  if (!Array.isArray(body.providers) || !body.providers.length) {
    errors.push("providers must be a non-empty array");
  }
  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateOptimizationProfileBody,
  validateProviderRecommendationBody,
};
