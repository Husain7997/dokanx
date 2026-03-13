function isBangladeshPhone(value) {
  const normalized = String(value || "").trim();
  return /^(?:\+8801|8801|01)\d{9}$/.test(normalized);
}

function validateRegisterBody(body = {}) {
  const errors = [];
  if (!String(body.name || "").trim()) errors.push("name is required");
  const email = String(body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) errors.push("email is required");
  const password = String(body.password || "");
  if (password.length < 6) errors.push("password must be at least 6 characters");
  if (body.phone !== undefined && body.phone !== null && body.phone !== "" && !isBangladeshPhone(body.phone)) {
    errors.push("phone must be a valid Bangladesh number");
  }
  return { valid: errors.length === 0, errors };
}

function validateLoginBody(body = {}) {
  const errors = [];
  const email = String(body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) errors.push("email is required");
  if (!String(body.password || "").trim()) errors.push("password is required");
  return { valid: errors.length === 0, errors };
}

function validateOtpRequestBody(body = {}) {
  const errors = [];
  if (!isBangladeshPhone(body.phone)) {
    errors.push("phone must be a valid Bangladesh number");
  }
  return { valid: errors.length === 0, errors };
}

function validateOtpVerifyBody(body = {}) {
  const errors = [];
  if (!isBangladeshPhone(body.phone)) {
    errors.push("phone must be a valid Bangladesh number");
  }
  const code = String(body.code || "").trim();
  if (!/^\d{6}$/.test(code)) {
    errors.push("code must be a 6 digit string");
  }
  return { valid: errors.length === 0, errors };
}

function validateMagicLinkRequestBody(body = {}) {
  const errors = [];
  const email = String(body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    errors.push("email is required");
  }
  return { valid: errors.length === 0, errors };
}

function validateMagicLinkVerifyBody(body = {}) {
  const errors = [];
  const token = String(body.token || "").trim();
  if (!token) errors.push("token is required");
  return { valid: errors.length === 0, errors };
}

function validateRefreshBody(body = {}) {
  const errors = [];
  if (!String(body.refreshToken || "").trim()) {
    errors.push("refreshToken is required");
  }
  return { valid: errors.length === 0, errors };
}

function validateLogoutBody(body = {}) {
  const errors = [];
  if (!String(body.refreshToken || "").trim()) {
    errors.push("refreshToken is required");
  }
  return { valid: errors.length === 0, errors };
}

function validateAcceptInviteBody(body = {}) {
  const errors = [];
  const token = String(body.token || "").trim();
  const password = String(body.password || "");

  if (!token) errors.push("token is required");
  if (password.length < 8) errors.push("password must be at least 8 characters");

  if (body.name !== undefined && !String(body.name || "").trim()) {
    errors.push("name cannot be empty");
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateRegisterBody,
  validateLoginBody,
  validateOtpRequestBody,
  validateOtpVerifyBody,
  validateMagicLinkRequestBody,
  validateMagicLinkVerifyBody,
  validateRefreshBody,
  validateLogoutBody,
  validateAcceptInviteBody,
};
