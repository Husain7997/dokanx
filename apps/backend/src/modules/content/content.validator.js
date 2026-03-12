function validatePageBody(body = {}) {
  const errors = [];
  if (!String(body.slug || "").trim()) errors.push("slug is required");
  if (!String(body.title || "").trim()) errors.push("title is required");
  return { valid: errors.length === 0, errors };
}

function validateSeoRuleBody(body = {}) {
  const errors = [];
  if (!String(body.entityType || "").trim()) errors.push("entityType is required");
  if (!String(body.entityRef || "").trim()) errors.push("entityRef is required");
  return { valid: errors.length === 0, errors };
}

function validateExperimentBody(body = {}) {
  const errors = [];
  if (!String(body.name || "").trim()) errors.push("name is required");
  if (!String(body.targetType || "").trim()) errors.push("targetType is required");
  if (!Array.isArray(body.variants) || !body.variants.length) errors.push("variants are required");
  return { valid: errors.length === 0, errors };
}

module.exports = {
  validatePageBody,
  validateSeoRuleBody,
  validateExperimentBody,
};
