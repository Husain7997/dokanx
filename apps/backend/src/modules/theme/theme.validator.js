function validateThemeBody(body = {}) {
  const errors = [];
  if (!String(body.name || "").trim()) errors.push("name is required");
  return { valid: errors.length === 0, errors };
}

function validateApplyThemeBody(body = {}) {
  const errors = [];
  if (!String(body.themeId || "").trim()) errors.push("themeId is required");
  return { valid: errors.length === 0, errors };
}

function validateIdParam(params = {}) {
  const id = String(params.themeId || "").trim();
  return { valid: Boolean(id), errors: id ? [] : ["themeId is required"] };
}

module.exports = {
  validateThemeBody,
  validateApplyThemeBody,
  validateIdParam,
};
