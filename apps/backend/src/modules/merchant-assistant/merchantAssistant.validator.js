function validateOpsAssistantBody(input) {
  const errors = [];

  if (typeof input.message !== "string" || !input.message.trim()) {
    errors.push("message is required");
  } else if (input.message.trim().length > 500) {
    errors.push("message must be at most 500 characters");
  }

  if (input.channel !== undefined) {
    const channel = String(input.channel).toUpperCase();
    if (!["WHATSAPP", "VOICE"].includes(channel)) {
      errors.push("channel must be WHATSAPP or VOICE");
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateCreateContactRequestBody(input) {
  const errors = [];

  if (typeof input.message !== "string" || !input.message.trim()) {
    errors.push("message is required");
  } else if (input.message.trim().length > 500) {
    errors.push("message must be at most 500 characters");
  }

  if (input.targetRole !== undefined) {
    const targetRole = String(input.targetRole).toUpperCase();
    if (!["ADMIN", "STAFF", "SUPPORT"].includes(targetRole)) {
      errors.push("targetRole must be ADMIN, STAFF or SUPPORT");
    }
  }

  if (input.channel !== undefined) {
    const channel = String(input.channel).toUpperCase();
    if (!["WHATSAPP", "VOICE"].includes(channel)) {
      errors.push("channel must be WHATSAPP or VOICE");
    }
  }

  if (input.priority !== undefined) {
    const priority = String(input.priority).toUpperCase();
    if (!["LOW", "MEDIUM", "HIGH"].includes(priority)) {
      errors.push("priority must be LOW, MEDIUM or HIGH");
    }
  }

  if (input.callbackPhone !== undefined && typeof input.callbackPhone !== "string") {
    errors.push("callbackPhone must be a string");
  }

  if (input.sourceIntent !== undefined) {
    const sourceIntent = String(input.sourceIntent).toUpperCase();
    if (!["CONTACT_SUPPORT", "MANUAL"].includes(sourceIntent)) {
      errors.push("sourceIntent must be CONTACT_SUPPORT or MANUAL");
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateContactRequestQuery(input) {
  const errors = [];

  if (input.status !== undefined) {
    const status = String(input.status).toUpperCase();
    if (!["QUEUED", "IN_PROGRESS", "RESOLVED", "CANCELLED"].includes(status)) {
      errors.push("status must be QUEUED, IN_PROGRESS, RESOLVED or CANCELLED");
    }
  }

  if (input.targetRole !== undefined) {
    const targetRole = String(input.targetRole).toUpperCase();
    if (!["ADMIN", "STAFF", "SUPPORT"].includes(targetRole)) {
      errors.push("targetRole must be ADMIN, STAFF or SUPPORT");
    }
  }

  if (input.limit !== undefined) {
    const limit = Number(input.limit);
    if (!Number.isFinite(limit) || limit < 1 || limit > 200) {
      errors.push("limit must be between 1 and 200");
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateContactRequestIdParam(input) {
  const errors = [];
  const requestId = String(input.requestId || "").trim();
  if (!requestId) {
    errors.push("requestId is required");
  }
  return { valid: errors.length === 0, errors };
}

function validateContactRequestStatusBody(input) {
  const errors = [];
  const status = String(input.status || "").toUpperCase();

  if (!["IN_PROGRESS", "RESOLVED", "CANCELLED"].includes(status)) {
    errors.push("status must be IN_PROGRESS, RESOLVED or CANCELLED");
  }

  if (input.note !== undefined && typeof input.note !== "string") {
    errors.push("note must be a string");
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateOpsAssistantBody,
  validateCreateContactRequestBody,
  validateContactRequestQuery,
  validateContactRequestIdParam,
  validateContactRequestStatusBody,
};
