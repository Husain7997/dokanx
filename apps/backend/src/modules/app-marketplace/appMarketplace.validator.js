const APP_TYPES = ["MARKETING", "ANALYTICS", "INTEGRATION", "UTILITY"];

function asUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function validateDeveloperBody(body = {}) {
  const errors = [];
  if (!String(body.name || "").trim()) errors.push("name is required");
  if (body.email !== undefined && !String(body.email || "").includes("@")) {
    errors.push("email must be valid");
  }
  return { valid: errors.length === 0, errors };
}

function validateAppBody(body = {}) {
  const errors = [];
  if (!String(body.name || "").trim()) errors.push("name is required");
  if (!String(body.slug || "").trim()) errors.push("slug is required");
  if (!APP_TYPES.includes(asUpper(body.type))) errors.push("type is invalid");
  if (body.permissions !== undefined && !Array.isArray(body.permissions)) {
    errors.push("permissions must be an array");
  }
  if (body.oauth?.redirectUris !== undefined && !Array.isArray(body.oauth.redirectUris)) {
    errors.push("oauth.redirectUris must be an array");
  }
  return { valid: errors.length === 0, errors };
}

function validateInstallBody(body = {}) {
  const errors = [];
  if (body.permissions !== undefined && !Array.isArray(body.permissions)) {
    errors.push("permissions must be an array");
  }
  return { valid: errors.length === 0, errors };
}

function validateAuthorizeQuery(query = {}) {
  const errors = [];
  if (!String(query.appId || "").trim()) errors.push("appId is required");
  if (!String(query.redirectUri || "").trim()) errors.push("redirectUri is required");
  return { valid: errors.length === 0, errors };
}

function validateTokenBody(body = {}) {
  const errors = [];
  if (!String(body.appId || "").trim()) errors.push("appId is required");
  if (!String(body.clientId || "").trim()) errors.push("clientId is required");
  if (!String(body.clientSecret || "").trim()) errors.push("clientSecret is required");
  if (!String(body.code || "").trim()) errors.push("code is required");
  return { valid: errors.length === 0, errors };
}

function validateWebhookBody(body = {}) {
  const errors = [];
  if (!String(body.eventName || "").trim()) errors.push("eventName is required");
  if (!String(body.targetUrl || "").trim()) errors.push("targetUrl is required");
  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateDeveloperBody,
  validateAppBody,
  validateInstallBody,
  validateAuthorizeQuery,
  validateTokenBody,
  validateWebhookBody,
};
