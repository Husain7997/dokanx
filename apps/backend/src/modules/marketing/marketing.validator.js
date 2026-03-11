const COUPON_TYPES = ["PERCENTAGE", "FIXED", "FREE_SHIPPING", "BUY_X_GET_Y"];
const AUTOMATION_TRIGGERS = ["ABANDONED_CART", "WELCOME", "REENGAGEMENT", "BIRTHDAY", "FIRST_PURCHASE"];
const AUTOMATION_CHANNELS = ["SMS", "EMAIL", "BOTH"];
const ACTION_TYPES = ["COUPON", "MESSAGE", "REMINDER"];
const EXECUTION_TRIGGERS = ["ABANDONED_CART", "WELCOME", "REENGAGEMENT", "BIRTHDAY", "FIRST_PURCHASE"];

function asUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function ensurePositiveNumber(value, field, errors, { allowZero = true } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || (!allowZero && parsed <= 0) || (allowZero && parsed < 0)) {
    errors.push(`${field} must be ${allowZero ? ">= 0" : "> 0"}`);
  }
}

function validateCouponBody(body = {}) {
  const errors = [];
  const code = asUpper(body.code);
  const type = asUpper(body.type);

  if (!code) errors.push("code is required");
  if (!COUPON_TYPES.includes(type)) errors.push("type is invalid");

  if (!["FREE_SHIPPING"].includes(type)) {
    ensurePositiveNumber(body.value, "value", errors);
  }

  if (body.minOrderAmount !== undefined) {
    ensurePositiveNumber(body.minOrderAmount, "minOrderAmount", errors);
  }

  if (body.usageLimit !== undefined) {
    ensurePositiveNumber(body.usageLimit, "usageLimit", errors);
  }

  if (type === "PERCENTAGE" && Number(body.value) > 100) {
    errors.push("value must be <= 100 for percentage coupons");
  }

  if (body.expiryDate && Number.isNaN(new Date(body.expiryDate).getTime())) {
    errors.push("expiryDate must be a valid date");
  }

  if (type === "BUY_X_GET_Y") {
    if (!body.buyXGetY || typeof body.buyXGetY !== "object") {
      errors.push("buyXGetY is required for BUY_X_GET_Y");
    } else {
      ensurePositiveNumber(body.buyXGetY.buyQuantity, "buyXGetY.buyQuantity", errors, {
        allowZero: false,
      });
      ensurePositiveNumber(body.buyXGetY.getQuantity, "buyXGetY.getQuantity", errors, {
        allowZero: false,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateCouponQuery(query = {}) {
  const errors = [];
  if (query.type && !COUPON_TYPES.includes(asUpper(query.type))) {
    errors.push("type is invalid");
  }
  return { valid: errors.length === 0, errors };
}

function validateAutomationBody(body = {}) {
  const errors = [];
  if (!String(body.name || "").trim()) errors.push("name is required");
  if (!AUTOMATION_TRIGGERS.includes(asUpper(body.trigger))) errors.push("trigger is invalid");
  if (body.channel && !AUTOMATION_CHANNELS.includes(asUpper(body.channel))) {
    errors.push("channel is invalid");
  }
  if (body.actionType && !ACTION_TYPES.includes(asUpper(body.actionType))) {
    errors.push("actionType is invalid");
  }
  if (body.delayMinutes !== undefined) {
    ensurePositiveNumber(body.delayMinutes, "delayMinutes", errors);
  }
  return { valid: errors.length === 0, errors };
}

function validateAutomationQuery(query = {}) {
  const errors = [];
  if (query.trigger && !AUTOMATION_TRIGGERS.includes(asUpper(query.trigger))) {
    errors.push("trigger is invalid");
  }
  return { valid: errors.length === 0, errors };
}

function validateCouponCodeParam(params = {}) {
  const code = asUpper(params.code);
  return {
    valid: Boolean(code),
    errors: code ? [] : ["code is required"],
  };
}

function validateAutomationIdParam(params = {}) {
  const id = String(params.ruleId || "").trim();
  return {
    valid: Boolean(id),
    errors: id ? [] : ["ruleId is required"],
  };
}

module.exports = {
  validateCouponBody,
  validateCouponQuery,
  validateAutomationBody,
  validateAutomationQuery,
  validateCouponCodeParam,
  validateAutomationIdParam,
  validateExecutionBody(body = {}) {
    const errors = [];
    if (!EXECUTION_TRIGGERS.includes(asUpper(body.trigger))) {
      errors.push("trigger is invalid");
    }
    return { valid: errors.length === 0, errors };
  },
};
