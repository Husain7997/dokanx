function validateSegmentBody(body = {}) {
  const errors = [];
  if (!String(body.name || "").trim()) errors.push("name is required");
  return { valid: errors.length === 0, errors };
}

function validateSegmentEvaluationBody(body = {}) {
  const errors = [];
  if (!Array.isArray(body.profiles)) errors.push("profiles must be an array");
  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateSegmentBody,
  validateSegmentEvaluationBody,
};
