function inSet(value, allowed) {
  return allowed.includes(String(value || "").toUpperCase());
}

function validateCreateTicketBody(input = {}) {
  const errors = [];
  if (typeof input.subject !== "string" || !input.subject.trim()) {
    errors.push("subject is required");
  }
  if (typeof input.description !== "string" || !input.description.trim()) {
    errors.push("description is required");
  }
  if (input.category !== undefined && !inSet(input.category, ["ORDER", "PAYMENT", "DELIVERY", "PRODUCT", "TECHNICAL", "GENERAL"])) {
    errors.push("category must be ORDER, PAYMENT, DELIVERY, PRODUCT, TECHNICAL or GENERAL");
  }
  if (input.priority !== undefined && !inSet(input.priority, ["LOW", "MEDIUM", "HIGH", "URGENT"])) {
    errors.push("priority must be LOW, MEDIUM, HIGH or URGENT");
  }
  if (input.orderId !== undefined && typeof input.orderId !== "string") {
    errors.push("orderId must be a string");
  }
  return { valid: errors.length === 0, errors };
}

function validateTicketQuery(input = {}) {
  const errors = [];
  if (input.status !== undefined && !inSet(input.status, ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"])) {
    errors.push("status must be OPEN, ASSIGNED, IN_PROGRESS, RESOLVED or CLOSED");
  }
  if (input.priority !== undefined && !inSet(input.priority, ["LOW", "MEDIUM", "HIGH", "URGENT"])) {
    errors.push("priority must be LOW, MEDIUM, HIGH or URGENT");
  }
  if (input.limit !== undefined) {
    const limit = Number(input.limit);
    if (!Number.isFinite(limit) || limit < 1 || limit > 200) {
      errors.push("limit must be between 1 and 200");
    }
  }
  return { valid: errors.length === 0, errors };
}

function validateTicketIdParam(input = {}) {
  const errors = [];
  if (!String(input.ticketId || "").trim()) {
    errors.push("ticketId is required");
  }
  return { valid: errors.length === 0, errors };
}

function validateUpdateTicketStatusBody(input = {}) {
  const errors = [];
  if (!inSet(input.status, ["ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"])) {
    errors.push("status must be ASSIGNED, IN_PROGRESS, RESOLVED or CLOSED");
  }
  if (input.note !== undefined && typeof input.note !== "string") {
    errors.push("note must be a string");
  }
  if (input.assignedTo !== undefined && typeof input.assignedTo !== "string") {
    errors.push("assignedTo must be a string");
  }
  return { valid: errors.length === 0, errors };
}

function validateCommentBody(input = {}) {
  const errors = [];
  if (typeof input.message !== "string" || !input.message.trim()) {
    errors.push("message is required");
  }
  return { valid: errors.length === 0, errors };
}

function validateQuickReplyBody(input = {}) {
  const errors = [];
  if (typeof input.title !== "string" || !input.title.trim()) {
    errors.push("title is required");
  }
  if (typeof input.body !== "string" || !input.body.trim()) {
    errors.push("body is required");
  }
  if (input.category !== undefined && !inSet(input.category, ["ORDER", "PAYMENT", "DELIVERY", "PRODUCT", "TECHNICAL", "GENERAL"])) {
    errors.push("category must be ORDER, PAYMENT, DELIVERY, PRODUCT, TECHNICAL or GENERAL");
  }
  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateCreateTicketBody,
  validateTicketQuery,
  validateTicketIdParam,
  validateUpdateTicketStatusBody,
  validateCommentBody,
  validateQuickReplyBody,
};
