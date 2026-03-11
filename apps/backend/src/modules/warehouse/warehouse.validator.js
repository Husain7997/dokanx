function asUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function validateWarehouseBody(body = {}) {
  const errors = [];
  if (!String(body.name || "").trim()) errors.push("name is required");
  if (body.type && !["MAIN_STORE", "WAREHOUSE", "PARTNER_STORE"].includes(asUpper(body.type))) {
    errors.push("type is invalid");
  }
  return { valid: errors.length === 0, errors };
}

function validateWarehouseStockBody(body = {}) {
  const errors = [];
  if (!String(body.warehouseId || "").trim()) errors.push("warehouseId is required");
  if (!String(body.productId || "").trim()) errors.push("productId is required");

  ["available", "reserved", "reorderPoint"].forEach(field => {
    if (body[field] !== undefined) {
      const parsed = Number(body[field]);
      if (!Number.isFinite(parsed) || parsed < 0) {
        errors.push(`${field} must be >= 0`);
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

function validateTransferBody(body = {}) {
  const errors = [];
  if (!String(body.productId || "").trim()) errors.push("productId is required");
  if (!String(body.fromWarehouseId || "").trim()) errors.push("fromWarehouseId is required");
  if (!String(body.toWarehouseId || "").trim()) errors.push("toWarehouseId is required");

  const quantity = Number(body.quantity);
  if (!Number.isFinite(quantity) || quantity < 1) errors.push("quantity must be >= 1");
  if (String(body.fromWarehouseId || "").trim() && String(body.fromWarehouseId) === String(body.toWarehouseId || "")) {
    errors.push("fromWarehouseId and toWarehouseId must be different");
  }

  return { valid: errors.length === 0, errors };
}

function validateTransferStatusBody(body = {}) {
  const status = asUpper(body.status);
  const valid = ["APPROVED", "SHIPPED", "RECEIVED", "CANCELLED"];
  return {
    valid: valid.includes(status),
    errors: valid.includes(status) ? [] : ["status is invalid"],
  };
}

function validateIdParam(params = {}) {
  const id = String(params.id || params.transferId || "").trim();
  return { valid: Boolean(id), errors: id ? [] : ["id is required"] };
}

function validateAlertsQuery(query = {}) {
  const errors = [];
  if (query.daysWithoutSale !== undefined) {
    const parsed = Number(query.daysWithoutSale);
    if (!Number.isFinite(parsed) || parsed < 1) errors.push("daysWithoutSale must be >= 1");
  }
  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateWarehouseBody,
  validateWarehouseStockBody,
  validateTransferBody,
  validateTransferStatusBody,
  validateIdParam,
  validateAlertsQuery,
};
