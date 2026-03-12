function validateOpenSessionBody(body = {}) {
  const errors = [];

  if (!String(body.terminalId || "").trim()) {
    errors.push("terminalId is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateOpenSessionBody,
};
