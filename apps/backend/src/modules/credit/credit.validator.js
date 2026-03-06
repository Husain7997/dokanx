function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalBoolean(value) {
  return value === undefined || typeof value === "boolean";
}

function isOptionalNumber(value) {
  return value === undefined || Number.isFinite(Number(value));
}

function validatePolicy(input) {
  const errors = [];

  if (!isOptionalBoolean(input.allowCredit)) errors.push("allowCredit must be boolean");
  if (!isOptionalBoolean(input.autoBlockCustomer)) errors.push("autoBlockCustomer must be boolean");

  if (input.defaultLimit !== undefined) {
    const n = Number(input.defaultLimit);
    if (!Number.isFinite(n) || n < 0) errors.push("defaultLimit must be a non-negative number");
  }

  if (input.maxOverdueDays !== undefined) {
    const n = Number(input.maxOverdueDays);
    if (!Number.isFinite(n) || n < 0) errors.push("maxOverdueDays must be a non-negative number");
  }

  return { valid: errors.length === 0, errors };
}

function validateRegisterCustomer(input) {
  const errors = [];
  if (!isNonEmptyString(input.phone)) errors.push("phone is required");
  if (input.name !== undefined && typeof input.name !== "string") errors.push("name must be a string");
  return { valid: errors.length === 0, errors };
}

function validateIssueOrPayment(input) {
  const errors = [];
  if (!isNonEmptyString(input.customerId)) errors.push("customerId is required");
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) errors.push("amount must be greater than 0");
  if (input.reference !== undefined && typeof input.reference !== "string") errors.push("reference must be a string");
  if (input.meta !== undefined && typeof input.meta !== "object") errors.push("meta must be an object");
  return { valid: errors.length === 0, errors };
}

function validateCustomerParams(input) {
  const errors = [];
  if (!isNonEmptyString(input.customerId)) errors.push("customerId param is required");
  return { valid: errors.length === 0, errors };
}

function validateListQuery(input) {
  const errors = [];

  if (input.limit !== undefined) {
    const limit = Number(input.limit);
    if (!Number.isFinite(limit) || limit < 1 || limit > 500) errors.push("limit must be between 1 and 500");
  }

  if (input.overdueOnly !== undefined) {
    const v = String(input.overdueOnly).toLowerCase();
    if (!["true", "false"].includes(v)) errors.push("overdueOnly must be true or false");
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  validatePolicy,
  validateRegisterCustomer,
  validateIssueOrPayment,
  validateCustomerParams,
  validateListQuery,
};
