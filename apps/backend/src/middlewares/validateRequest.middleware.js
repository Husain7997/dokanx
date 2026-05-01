function createValidationError(message, field, location) {
  return {
    field,
    location,
    message,
  };
}

function validateRequest(schema = {}) {
  return (req, res, next) => {
    const failures = [];

    for (const [location, validator] of Object.entries(schema)) {
      if (typeof validator !== "function") continue;
      const result = validator(req[location], req);
      if (!result) continue;
      if (Array.isArray(result)) {
        failures.push(...result.filter(Boolean));
      } else {
        failures.push(result);
      }
    }

    if (failures.length) {
      return res.status(400).json({
        success: false,
        message: "Request validation failed",
        errors: failures.map((failure) =>
          typeof failure === "string"
            ? createValidationError(failure, null, "body")
            : failure
        ),
      });
    }

    return next();
  };
}

module.exports = {
  validateRequest,
  createValidationError,
};
