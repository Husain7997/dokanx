const mongoose = require("mongoose");
const { createValidationError } = require("../middlewares/validateRequest.middleware");

function isObjectId(value) {
  return mongoose.isValidObjectId(String(value || ""));
}

function requiredString(field, value, location = "body", options = {}) {
  const normalized = String(value || "").trim();
  if (!normalized) return createValidationError(`${field} is required`, field, location);
  if (options.max && normalized.length > options.max) {
    return createValidationError(`${field} exceeds maximum length`, field, location);
  }
  return null;
}

function requiredNumber(field, value, location = "body", options = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return createValidationError(`${field} must be a valid number`, field, location);
  }
  if (options.min != null && numeric < options.min) {
    return createValidationError(`${field} must be at least ${options.min}`, field, location);
  }
  if (options.max != null && numeric > options.max) {
    return createValidationError(`${field} must be at most ${options.max}`, field, location);
  }
  return null;
}

function objectIdField(field, value, location = "body", required = true) {
  if (!value && !required) return null;
  if (!isObjectId(value)) {
    return createValidationError(`${field} must be a valid id`, field, location);
  }
  return null;
}

function arrayField(field, value, location = "body", options = {}) {
  if (!Array.isArray(value)) {
    return createValidationError(`${field} must be an array`, field, location);
  }
  if (options.min != null && value.length < options.min) {
    return createValidationError(`${field} must contain at least ${options.min} item(s)`, field, location);
  }
  if (options.max != null && value.length > options.max) {
    return createValidationError(`${field} exceeds maximum item count`, field, location);
  }
  return null;
}

function validateOrderCreateBody(body) {
  const errors = [];
  errors.push(arrayField("items", body?.items, "body", { min: 1, max: 100 }));
  errors.push(requiredNumber("totalAmount", body?.totalAmount, "body", { min: 0.01, max: 10000000 }));

  const paymentMode = String(body?.paymentMode || "ONLINE").toUpperCase();
  if (!["ONLINE", "COD", "CREDIT", "WALLET"].includes(paymentMode)) {
    errors.push(createValidationError("paymentMode is invalid", "paymentMode", "body"));
  }

  if (body?.shopId) {
    errors.push(objectIdField("shopId", body.shopId, "body"));
  }

  if (Array.isArray(body?.items)) {
    body.items.forEach((item, index) => {
      if (item?.product) {
        errors.push(objectIdField(`items[${index}].product`, item.product, "body"));
      }
      errors.push(requiredNumber(`items[${index}].quantity`, item?.quantity, "body", { min: 1, max: 1000 }));
    });
  }

  return errors.filter(Boolean);
}

function validateOrderStatusBody(body) {
  const errors = [];
  const allowedStatus = ["PLACED", "PAYMENT_PENDING", "PAYMENT_FAILED", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
  const allowedDisputeStatus = ["NONE", "OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"];
  const allowedDisputeReason = ["NONE", "CUSTOMER_CLAIM", "DELIVERY_DELAY", "DAMAGED", "PAYMENT_ISSUE", "FRAUD", "OTHER"];

  if (body?.status && !allowedStatus.includes(String(body.status).toUpperCase())) {
    errors.push(createValidationError("status is invalid", "status", "body"));
  }
  if (body?.disputeStatus && !allowedDisputeStatus.includes(String(body.disputeStatus).toUpperCase())) {
    errors.push(createValidationError("disputeStatus is invalid", "disputeStatus", "body"));
  }
  if (body?.disputeReason && !allowedDisputeReason.includes(String(body.disputeReason).toUpperCase())) {
    errors.push(createValidationError("disputeReason is invalid", "disputeReason", "body"));
  }
  if (!body?.status && !body?.disputeStatus && body?.adminNotes === undefined && !body?.disputeReason) {
    errors.push(createValidationError("At least one updatable field is required", null, "body"));
  }
  return errors;
}

function validatePaymentInitiateBody(body) {
  const provider = String(body?.provider || "bkash").trim().toLowerCase();
  if (!["bkash", "nagad", "stripe"].includes(provider)) {
    return [createValidationError("provider is invalid", "provider", "body")];
  }
  return [];
}

function validatePaymentRetryBody(body) {
  return [objectIdField("orderId", body?.orderId, "body")].filter(Boolean);
}

function validatePaymentRefundBody(body) {
  const errors = [];
  errors.push(objectIdField("orderId", body?.orderId, "body"));
  errors.push(requiredNumber("amount", body?.amount, "body", { min: 0.01, max: 10000000 }));
  errors.push(requiredString("reason", body?.reason, "body", { max: 500 }));
  return errors.filter(Boolean);
}

function validateProductBody(body) {
  const errors = [];
  errors.push(requiredString("name", body?.name, "body", { max: 200 }));
  errors.push(requiredNumber("price", body?.price, "body", { min: 0, max: 10000000 }));
  if (body?.costPrice !== undefined) {
    errors.push(requiredNumber("costPrice", body?.costPrice, "body", { min: 0, max: 10000000 }));
  }
  if (body?.stock !== undefined) {
    errors.push(requiredNumber("stock", body?.stock, "body", { min: 0, max: 1000000 }));
  }
  return errors.filter(Boolean);
}

function validateProductBulkBody(body) {
  const errors = [arrayField("rows", body?.rows, "body", { min: 1, max: 250 })].filter(Boolean);
  if (Array.isArray(body?.rows)) {
    body.rows.forEach((row, index) => {
      const rowErrors = validateProductBody(row).map((error) =>
        createValidationError(error.message, `rows[${index}].${error.field}`, "body")
      );
      errors.push(...rowErrors);
    });
  }
  return errors;
}

function validateProductReviewBody(body) {
  const errors = [];
  errors.push(requiredNumber("rating", body?.rating, "body", { min: 1, max: 5 }));
  errors.push(requiredString("message", body?.message, "body", { max: 1000 }));
  return errors.filter(Boolean);
}

function validateAdminUpdateUserBody(body) {
  const errors = [];
  const allowedRoles = ["ADMIN", "OWNER", "STAFF", "CUSTOMER", "DEVELOPER", "AGENT", "SUPER_ADMIN", "FINANCE_ADMIN", "SUPPORT_ADMIN", "AUDIT_ADMIN"];
  if (body?.role && !allowedRoles.includes(String(body.role).toUpperCase())) {
    errors.push(createValidationError("role is invalid", "role", "body"));
  }
  if (body?.permissionOverrides !== undefined && !Array.isArray(body.permissionOverrides)) {
    errors.push(createValidationError("permissionOverrides must be an array", "permissionOverrides", "body"));
  }
  if (body?.role === undefined && body?.permissionOverrides === undefined) {
    errors.push(createValidationError("role or permissionOverrides is required", null, "body"));
  }
  return errors;
}

function validateAdminCommissionBody(body) {
  return [requiredNumber("commissionRate", body?.commissionRate, "body", { min: 0, max: 100 })].filter(Boolean);
}

function validateSensitiveOtpChallengeBody(body) {
  const errors = [];
  const allowedActions = [
    "PAYMENT_REFUND",
    "ADJUSTMENT_REFUND",
    "ADJUSTMENT_WALLET",
    "PAYOUT_APPROVE",
    "PAYOUT_EXECUTE",
    "PAYOUT_MANUAL",
    "PAYOUT_RETRY",
    "SETTLEMENT_PAYOUT",
    "SETTLEMENT_RETRY",
  ];
  const action = String(body?.action || "").trim().toUpperCase();

  if (!action) {
    errors.push(createValidationError("action is required", "action", "body"));
  } else if (!allowedActions.includes(action)) {
    errors.push(createValidationError("action is invalid", "action", "body"));
  }

  errors.push(requiredString("targetId", body?.targetId, "body", { max: 200 }));

  if (body?.targetType !== undefined) {
    errors.push(requiredString("targetType", body?.targetType, "body", { max: 100 }));
  }

  return errors.filter(Boolean);
}

function validatePasswordResetRequest(body) {
  const errors = [];
  const email = String(body?.email || "").trim().toLowerCase();
  errors.push(requiredString("email", email, "body", { max: 320 }));

  if (email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      errors.push(createValidationError("email is invalid", "email", "body"));
    }
  }

  return errors.filter(Boolean);
}

function validatePasswordResetConfirm(body) {
  const errors = [];
  const email = String(body?.email || "").trim().toLowerCase();
  errors.push(requiredString("email", email, "body", { max: 320 }));
  errors.push(requiredString("code", body?.code, "body", { max: 16 }));
  const password = String(body?.password || "");

  if (!password) {
    errors.push(createValidationError("password is required", "password", "body"));
  } else {
    if (password.length < 8) {
      errors.push(createValidationError("password must be at least 8 characters", "password", "body"));
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      errors.push(createValidationError("password must include letters and numbers", "password", "body"));
    }
  }

  if (email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      errors.push(createValidationError("email is invalid", "email", "body"));
    }
  }

  return errors.filter(Boolean);
}

function validateIdParam(field = "id") {
  return (params) => [objectIdField(field, params?.[field], "params")].filter(Boolean);
}

module.exports = {
  schemas: {
    orderCreate: { body: validateOrderCreateBody },
    orderStatusUpdate: { params: validateIdParam("orderId"), body: validateOrderStatusBody },
    paymentInitiate: { params: validateIdParam("orderId"), body: validatePaymentInitiateBody },
    paymentRetry: { body: validatePaymentRetryBody },
    paymentRefund: { body: validatePaymentRefundBody },
    productCreate: { body: validateProductBody },
    productBulkCreate: { body: validateProductBulkBody },
    productUpdate: { params: validateIdParam("productId"), body: validateProductBody },
    productDelete: { params: validateIdParam("productId") },
    productInventory: { params: validateIdParam("productId") },
    productReview: { params: validateIdParam("productId"), body: validateProductReviewBody },
    adminUserUpdate: { params: validateIdParam("id"), body: validateAdminUpdateUserBody },
    adminUserTarget: { params: validateIdParam("id") },
    adminShopTarget: { params: validateIdParam("id") },
    adminCommission: { params: validateIdParam("shopId"), body: validateAdminCommissionBody },
    sensitiveOtpChallenge: { body: validateSensitiveOtpChallengeBody },
    passwordResetRequest: { body: validatePasswordResetRequest },
    passwordResetConfirm: { body: validatePasswordResetConfirm },
  },
};
