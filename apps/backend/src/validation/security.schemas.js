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

function strictObject(body, { allowed = [], required = [], location = "body" } = {}) {
  const errors = [];
  const payload = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  if (payload !== body) {
    errors.push(createValidationError(`${location} must be an object`, null, location));
    return errors;
  }

  const allowedSet = new Set(allowed);
  Object.keys(payload).forEach((field) => {
    if (!allowedSet.has(field)) {
      errors.push(createValidationError(`${field} is not allowed`, field, location));
    }
  });

  required.forEach((field) => {
    if (payload[field] === undefined || payload[field] === null || payload[field] === "") {
      errors.push(createValidationError(`${field} is required`, field, location));
    }
  });

  return errors;
}

function optionalString(field, value, location = "body", options = {}) {
  if (value === undefined || value === null || value === "") return null;
  return requiredString(field, value, location, options);
}

function optionalNumber(field, value, location = "body", options = {}) {
  if (value === undefined || value === null || value === "") return null;
  return requiredNumber(field, value, location, options);
}

function optionalObjectId(field, value, location = "body") {
  if (value === undefined || value === null || value === "") return null;
  return objectIdField(field, value, location);
}

function validateEmail(field, value, location = "body") {
  const email = String(value || "").trim().toLowerCase();
  const base = requiredString(field, email, location, { max: 320 });
  if (base) return base;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return createValidationError(`${field} is invalid`, field, location);
  }
  return null;
}

function validatePassword(field, value, location = "body") {
  const password = String(value || "");
  if (!password) return createValidationError(`${field} is required`, field, location);
  if (password.length < 8) return createValidationError(`${field} must be at least 8 characters`, field, location);
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return createValidationError(`${field} must include letters and numbers`, field, location);
  }
  return null;
}

function validateRegisterBody(body) {
  const errors = strictObject(body, {
    allowed: ["name", "email", "phone", "password"],
    required: ["name", "password"],
  });
  errors.push(requiredString("name", body?.name, "body", { max: 120 }));
  if (!body?.email && !body?.phone) {
    errors.push(createValidationError("Email or phone is required", null, "body"));
  } else if (!body?.email) {
    errors.push(createValidationError("Email is required", "email", "body"));
  } else {
    errors.push(validateEmail("email", body?.email));
  }
  errors.push(optionalString("phone", body?.phone, "body", { max: 30 }));
  errors.push(validatePassword("password", body?.password));
  return errors.filter(Boolean);
}

function validateLoginBody(body) {
  const errors = strictObject(body, {
    allowed: ["email", "phone", "password"],
    required: ["email", "password"],
  });
  const loginId = String(body?.email || body?.phone || "").trim();
  if (!loginId) {
    errors.push(createValidationError("Email or phone is required", "email", "body"));
  } else if (loginId.includes("@")) {
    errors.push(validateEmail("email", loginId));
  } else if (!/^\+?[0-9\-()\s]{8,20}$/.test(loginId)) {
    errors.push(createValidationError("Valid email or phone is required", "email", "body"));
  }
  errors.push(requiredString("password", body?.password, "body", { max: 200 }));
  return errors.filter(Boolean);
}

function validateRefreshBody(body = {}) {
  const errors = strictObject(body, {
    allowed: ["refreshToken"],
    required: [],
  });
  errors.push(optionalString("refreshToken", body?.refreshToken, "body", { max: 4096 }));
  return errors.filter(Boolean);
}

function validateInvitationAcceptBody(body) {
  const errors = strictObject(body, {
    allowed: ["token", "password", "name"],
    required: ["token", "password"],
  });
  errors.push(requiredString("token", body?.token, "body", { max: 512 }));
  errors.push(validatePassword("password", body?.password));
  errors.push(optionalString("name", body?.name, "body", { max: 120 }));
  return errors.filter(Boolean);
}

function validateOrderCreateBody(body) {
  const errors = strictObject(body, {
    allowed: ["items", "totalAmount", "paymentMode", "deliveryMode", "deliveryAddress", "addressId", "campaignId", "notes", "multiShopGroup", "shopId", "shippingFee"],
    required: ["items", "totalAmount"],
  });
  errors.push(arrayField("items", body?.items, "body", { min: 1, max: 100 }));
  errors.push(requiredNumber("totalAmount", body?.totalAmount, "body", { min: 0.01, max: 10000000 }));
  errors.push(optionalObjectId("shopId", body?.shopId, "body"));
  if (body?.shippingFee !== undefined) errors.push(requiredNumber("shippingFee", body.shippingFee, "body", { min: 0, max: 1000000 }));

  const paymentMode = String(body?.paymentMode || "ONLINE").toUpperCase();
  if (paymentMode !== "COD") {
    errors.push(createValidationError("Only cash on delivery is currently available", "paymentMode", "body"));
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

function validateCheckoutBody(body) {
  const errors = strictObject(body, {
    allowed: ["items", "totalAmount", "paymentMode", "deliveryMode", "deliveryAddress", "addressId", "campaignId", "notes", "multiShopGroup", "shopId", "shippingFee"],
    required: ["items", "totalAmount"],
  });
  errors.push(arrayField("items", body?.items, "body", { min: 1, max: 100 }));
  errors.push(requiredNumber("totalAmount", body?.totalAmount, "body", { min: 0.01, max: 10000000 }));
  errors.push(optionalObjectId("shopId", body?.shopId, "body"));
  if (body?.shippingFee !== undefined) errors.push(requiredNumber("shippingFee", body.shippingFee, "body", { min: 0, max: 1000000 }));
  const paymentMode = String(body?.paymentMode || "COD").toUpperCase();
  if (paymentMode !== "COD") {
    errors.push(createValidationError("Only cash on delivery is currently available", "paymentMode", "body"));
  }
  errors.push(optionalObjectId("addressId", body?.addressId, "body"));
  errors.push(optionalObjectId("campaignId", body?.campaignId, "body"));
  errors.push(optionalString("notes", body?.notes, "body", { max: 1000 }));
  return errors.filter(Boolean);
}

function validateOrderStatusBody(body) {
  const errors = strictObject(body, {
    allowed: ["status", "disputeStatus", "disputeReason", "adminNotes"],
    required: [],
  });
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

function validateWalletCreditBody(body) {
  const errors = strictObject(body, {
    allowed: ["amount", "referenceId", "reference"],
    required: ["amount"],
  });
  errors.push(requiredNumber("amount", body?.amount, "body", { min: 0.01, max: 10000000 }));
  errors.push(optionalString("referenceId", body?.referenceId, "body", { max: 200 }));
  errors.push(optionalString("reference", body?.reference, "body", { max: 200 }));
  return errors.filter(Boolean);
}

function validateWalletDebitBody(body) {
  const errors = strictObject(body, {
    allowed: ["amount", "toShopId", "referenceId", "reference"],
    required: ["amount", "toShopId"],
  });
  errors.push(requiredNumber("amount", body?.amount, "body", { min: 0.01, max: 10000000 }));
  errors.push(objectIdField("toShopId", body?.toShopId, "body"));
  errors.push(optionalString("referenceId", body?.referenceId, "body", { max: 200 }));
  errors.push(optionalString("reference", body?.reference, "body", { max: 200 }));
  return errors.filter(Boolean);
}

function validateShippingRateQuery(query) {
  const errors = strictObject(query, {
    allowed: ["destination"],
    required: ["destination"],
    location: "query",
  });
  errors.push(requiredString("destination", query?.destination, "query", { max: 200 }));
  return errors.filter(Boolean);
}

function validateShipmentCreateBody(body) {
  const errors = strictObject(body, {
    allowed: ["orderId", "carrier"],
    required: ["orderId", "carrier"],
  });
  errors.push(objectIdField("orderId", body?.orderId, "body"));
  errors.push(requiredString("carrier", body?.carrier, "body", { max: 80 }));
  return errors.filter(Boolean);
}

function validateCreditSaleBody(body) {
  const errors = strictObject(body, {
    allowed: ["orderId", "customerId", "amount"],
    required: ["orderId"],
  });
  errors.push(objectIdField("orderId", body?.orderId, "body"));
  errors.push(optionalObjectId("customerId", body?.customerId, "body"));
  errors.push(optionalNumber("amount", body?.amount, "body", { min: 0.01, max: 10000000 }));
  return errors.filter(Boolean);
}

function validateCreditPolicyBody(body) {
  const errors = strictObject(body, {
    allowed: ["customerId", "creditLimit", "status", "source"],
    required: ["customerId"],
  });
  errors.push(objectIdField("customerId", body?.customerId, "body"));
  if (body?.creditLimit !== undefined) errors.push(requiredNumber("creditLimit", body.creditLimit, "body", { min: 0, max: 10000000 }));
  if (body?.status && !["ACTIVE", "BLOCKED"].includes(String(body.status).toUpperCase())) {
    errors.push(createValidationError("status is invalid", "status", "body"));
  }
  errors.push(optionalString("source", body?.source, "body", { max: 100 }));
  return errors.filter(Boolean);
}

function validateCreditPaymentBody(body) {
  const errors = strictObject(body, {
    allowed: ["creditSaleId", "customerId", "amount", "referenceId", "metadata", "paymentMode", "provider"],
    required: ["amount", "referenceId"],
  });
  errors.push(optionalObjectId("creditSaleId", body?.creditSaleId, "body"));
  errors.push(optionalObjectId("customerId", body?.customerId, "body"));
  errors.push(requiredNumber("amount", body?.amount, "body", { min: 0.01, max: 10000000 }));
  errors.push(requiredString("referenceId", body?.referenceId, "body", { max: 200 }));
  if (body?.paymentMode && !["WALLET", "ONLINE"].includes(String(body.paymentMode).toUpperCase())) {
    errors.push(createValidationError("paymentMode is invalid", "paymentMode", "body"));
  }
  errors.push(optionalString("provider", body?.provider, "body", { max: 80 }));
  return errors.filter(Boolean);
}

function validateBillingPlanBody(body) {
  const errors = strictObject(body, {
    allowed: ["name", "price", "duration", "limits", "features"],
    required: ["name", "price"],
  });
  errors.push(requiredString("name", body?.name, "body", { max: 120 }));
  errors.push(requiredNumber("price", body?.price, "body", { min: 0, max: 10000000 }));
  errors.push(optionalString("duration", body?.duration, "body", { max: 40 }));
  return errors.filter(Boolean);
}

function validateBillingSubscriptionBody(body) {
  const errors = strictObject(body, {
    allowed: ["tenantId", "planId", "status", "currentPeriodEnd"],
    required: ["tenantId", "planId"],
  });
  errors.push(objectIdField("tenantId", body?.tenantId, "body"));
  errors.push(objectIdField("planId", body?.planId, "body"));
  if (body?.status && !["ACTIVE", "PAST_DUE", "CANCELLED", "TRIALING"].includes(String(body.status).toUpperCase())) {
    errors.push(createValidationError("status is invalid", "status", "body"));
  }
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
  if (body?.minStock !== undefined) {
    errors.push(requiredNumber("minStock", body?.minStock, "body", { min: 0, max: 1000000 }));
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

function validateAccountOtpSend(body) {
  const errors = strictObject(body, {
    allowed: ["email", "channel"],
    required: ["email"],
  });
  errors.push(validateEmail("email", body?.email));
  const channel = String(body?.channel || "sms").trim().toLowerCase();
  if (body?.channel !== undefined && !["sms", "email", "whatsapp"].includes(channel)) {
    errors.push(createValidationError("channel is invalid", "channel", "body"));
  }
  return errors.filter(Boolean);
}

function validateAccountOtpVerify(body) {
  const errors = strictObject(body, {
    allowed: ["email", "code"],
    required: ["email", "code"],
  });
  errors.push(validateEmail("email", body?.email));
  errors.push(requiredString("code", body?.code, "body", { max: 16 }));
  return errors.filter(Boolean);
}

function validateIdParam(field = "id") {
  return (params) => [objectIdField(field, params?.[field], "params")].filter(Boolean);
}

module.exports = {
  schemas: {
    orderCreate: { body: validateOrderCreateBody },
    checkout: { body: validateCheckoutBody },
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
    authRegister: { body: validateRegisterBody },
    authLogin: { body: validateLoginBody },
    authRefresh: { body: validateRefreshBody },
    authLogout: { body: validateRefreshBody },
    authInvitationAccept: { body: validateInvitationAcceptBody },
    walletCredit: { body: validateWalletCreditBody },
    walletDebit: { body: validateWalletDebitBody },
    shippingRates: { query: validateShippingRateQuery },
    shippingCreateShipment: { body: validateShipmentCreateBody },
    creditSale: { body: validateCreditSaleBody },
    creditPolicy: { body: validateCreditPolicyBody },
    creditPayment: { body: validateCreditPaymentBody },
    billingPlan: { body: validateBillingPlanBody },
    billingPlanTarget: { params: validateIdParam("planId") },
    billingSubscription: { body: validateBillingSubscriptionBody },
    sensitiveOtpChallenge: { body: validateSensitiveOtpChallengeBody },
    accountOtpSend: { body: validateAccountOtpSend },
    accountOtpVerify: { body: validateAccountOtpVerify },
    passwordResetRequest: { body: validatePasswordResetRequest },
    passwordResetConfirm: { body: validatePasswordResetConfirm },
  },
};
