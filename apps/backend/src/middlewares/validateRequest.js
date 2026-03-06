function badRequest(res, errors) {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: Array.isArray(errors) ? errors : [String(errors || "Invalid request")],
  });
}

function runValidator(validator, payload) {
  if (typeof validator !== "function") {
    return { valid: true, errors: [] };
  }

  const result = validator(payload);
  if (!result) return { valid: true, errors: [] };
  if (result.valid === false) {
    return {
      valid: false,
      errors: result.errors || ["Invalid request"],
    };
  }
  return { valid: true, errors: [] };
}

function validateBody(validator) {
  return (req, res, next) => {
    const result = runValidator(validator, req.body || {});
    if (!result.valid) return badRequest(res, result.errors);
    next();
  };
}

function validateQuery(validator) {
  return (req, res, next) => {
    const result = runValidator(validator, req.query || {});
    if (!result.valid) return badRequest(res, result.errors);
    next();
  };
}

function validateParams(validator) {
  return (req, res, next) => {
    const result = runValidator(validator, req.params || {});
    if (!result.valid) return badRequest(res, result.errors);
    next();
  };
}

module.exports = {
  validateBody,
  validateQuery,
  validateParams,
};
