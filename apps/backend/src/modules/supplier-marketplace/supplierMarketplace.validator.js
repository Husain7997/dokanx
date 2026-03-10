function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function validateSupplierSearchQuery(input) {
  const errors = [];

  if (input.q !== undefined && typeof input.q !== "string") {
    errors.push("q must be a string");
  }

  if (input.category !== undefined && typeof input.category !== "string") {
    errors.push("category must be a string");
  }

  if (input.area !== undefined && typeof input.area !== "string") {
    errors.push("area must be a string");
  }

  if (input.lat !== undefined) {
    const lat = toNumber(input.lat);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      errors.push("lat must be a number between -90 and 90");
    }
  }

  if (input.lng !== undefined) {
    const lng = toNumber(input.lng);
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      errors.push("lng must be a number between -180 and 180");
    }
  }

  if (input.radiusKm !== undefined) {
    const r = toNumber(input.radiusKm);
    if (!Number.isFinite(r) || r <= 0 || r > 100) {
      errors.push("radiusKm must be between 0 and 100");
    }
  }

  if (input.limit !== undefined) {
    const limit = toNumber(input.limit);
    if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
      errors.push("limit must be between 1 and 100");
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateSupplierOffersQuery(input) {
  const errors = [];

  if (input.q !== undefined && typeof input.q !== "string") {
    errors.push("q must be a string");
  }

  if (input.category !== undefined && typeof input.category !== "string") {
    errors.push("category must be a string");
  }

  if (input.brand !== undefined && typeof input.brand !== "string") {
    errors.push("brand must be a string");
  }

  if (input.limit !== undefined) {
    const limit = toNumber(input.limit);
    if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
      errors.push("limit must be between 1 and 100");
    }
  }

  if (input.minPrice !== undefined) {
    const min = toNumber(input.minPrice);
    if (!Number.isFinite(min) || min < 0) {
      errors.push("minPrice must be a non-negative number");
    }
  }

  if (input.maxPrice !== undefined) {
    const max = toNumber(input.maxPrice);
    if (!Number.isFinite(max) || max < 0) {
      errors.push("maxPrice must be a non-negative number");
    }
  }

  if (input.minPrice !== undefined && input.maxPrice !== undefined) {
    const min = toNumber(input.minPrice);
    const max = toNumber(input.maxPrice);
    if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
      errors.push("minPrice cannot be greater than maxPrice");
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateSupplierReliabilityQuery(input) {
  const errors = [];

  if (input.q !== undefined && typeof input.q !== "string") {
    errors.push("q must be a string");
  }

  if (input.category !== undefined && typeof input.category !== "string") {
    errors.push("category must be a string");
  }

  if (input.area !== undefined && typeof input.area !== "string") {
    errors.push("area must be a string");
  }

  if (input.lat !== undefined) {
    const lat = toNumber(input.lat);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      errors.push("lat must be a number between -90 and 90");
    }
  }

  if (input.lng !== undefined) {
    const lng = toNumber(input.lng);
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      errors.push("lng must be a number between -180 and 180");
    }
  }

  if (input.radiusKm !== undefined) {
    const r = toNumber(input.radiusKm);
    if (!Number.isFinite(r) || r <= 0 || r > 100) {
      errors.push("radiusKm must be between 0 and 100");
    }
  }

  if (input.days !== undefined) {
    const days = Number(input.days);
    if (!Number.isFinite(days) || days < 7 || days > 365) {
      errors.push("days must be between 7 and 365");
    }
  }

  if (input.limit !== undefined) {
    const limit = Number(input.limit);
    if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
      errors.push("limit must be between 1 and 100");
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateSupplierIdParam(input) {
  const errors = [];
  const supplierId = String(input.supplierId || "").trim();
  if (!supplierId) {
    errors.push("supplierId is required");
  }
  return { valid: errors.length === 0, errors };
}

function validateOfferIdParam(input) {
  const errors = [];
  const supplierId = String(input.supplierId || "").trim();
  const offerId = String(input.offerId || "").trim();
  if (!supplierId) {
    errors.push("supplierId is required");
  }
  if (!offerId) {
    errors.push("offerId is required");
  }
  return { valid: errors.length === 0, errors };
}

function validateCreateOrUpdateOfferBody(input) {
  const errors = [];

  if (typeof input.title !== "string" || !input.title.trim()) {
    errors.push("title is required");
  }

  if (input.productName !== undefined && typeof input.productName !== "string") {
    errors.push("productName must be a string");
  }

  if (input.brand !== undefined && typeof input.brand !== "string") {
    errors.push("brand must be a string");
  }

  if (input.category !== undefined && typeof input.category !== "string") {
    errors.push("category must be a string");
  }

  if (input.barcode !== undefined && typeof input.barcode !== "string") {
    errors.push("barcode must be a string");
  }

  if (input.unit !== undefined && typeof input.unit !== "string") {
    errors.push("unit must be a string");
  }

  const wholesalePrice = Number(input.wholesalePrice);
  if (!Number.isFinite(wholesalePrice) || wholesalePrice < 0) {
    errors.push("wholesalePrice must be a non-negative number");
  }

  if (input.minOrderQty !== undefined) {
    const minOrderQty = Number(input.minOrderQty);
    if (!Number.isFinite(minOrderQty) || minOrderQty < 1) {
      errors.push("minOrderQty must be at least 1");
    }
  }

  if (input.availableQty !== undefined) {
    const availableQty = Number(input.availableQty);
    if (!Number.isFinite(availableQty) || availableQty < 0) {
      errors.push("availableQty must be a non-negative number");
    }
  }

  if (input.leadTimeDays !== undefined) {
    const leadTimeDays = Number(input.leadTimeDays);
    if (!Number.isFinite(leadTimeDays) || leadTimeDays < 0) {
      errors.push("leadTimeDays must be a non-negative number");
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateCreateBulkOrderBody(input) {
  const errors = [];

  if (typeof input.supplierId !== "string" || !input.supplierId.trim()) {
    errors.push("supplierId is required");
  }

  if (!Array.isArray(input.items) || !input.items.length) {
    errors.push("items must be a non-empty array");
  } else {
    for (const [index, item] of input.items.entries()) {
      const offerId = String(item?.offerId || "").trim();
      const qty = Number(item?.quantity);

      if (!offerId) {
        errors.push(`items[${index}].offerId is required`);
      }
      if (!Number.isFinite(qty) || qty < 1) {
        errors.push(`items[${index}].quantity must be at least 1`);
      }
    }
  }

  if (input.notes !== undefined && typeof input.notes !== "string") {
    errors.push("notes must be a string");
  }

  return { valid: errors.length === 0, errors };
}

function validateBulkOrdersQuery(input) {
  const errors = [];

  if (input.mode !== undefined) {
    const mode = String(input.mode).toLowerCase();
    if (!["buyer", "seller"].includes(mode)) {
      errors.push("mode must be buyer or seller");
    }
  }

  if (input.status !== undefined) {
    const status = String(input.status).toUpperCase();
    if (!["PENDING", "ACCEPTED", "REJECTED", "CANCELLED", "FULFILLED"].includes(status)) {
      errors.push("status must be PENDING, ACCEPTED, REJECTED, CANCELLED or FULFILLED");
    }
  }

  if (input.limit !== undefined) {
    const limit = Number(input.limit);
    if (!Number.isFinite(limit) || limit < 1 || limit > 200) {
      errors.push("limit must be between 1 and 200");
    }
  }

  if (input.supplierId !== undefined && typeof input.supplierId !== "string") {
    errors.push("supplierId must be a string");
  }

  return { valid: errors.length === 0, errors };
}

function validateBulkOrderIdParam(input) {
  const errors = [];
  const orderId = String(input.orderId || "").trim();
  if (!orderId) {
    errors.push("orderId is required");
  }
  return { valid: errors.length === 0, errors };
}

function validateBulkOrderStatusBody(input) {
  const errors = [];
  const action = String(input.action || "").toUpperCase();

  if (!["ACCEPT", "REJECT", "FULFILL", "CANCEL"].includes(action)) {
    errors.push("action must be ACCEPT, REJECT, FULFILL or CANCEL");
  }

  if (input.note !== undefined && typeof input.note !== "string") {
    errors.push("note must be a string");
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateSupplierSearchQuery,
  validateSupplierOffersQuery,
  validateSupplierReliabilityQuery,
  validateSupplierIdParam,
  validateOfferIdParam,
  validateCreateOrUpdateOfferBody,
  validateCreateBulkOrderBody,
  validateBulkOrdersQuery,
  validateBulkOrderIdParam,
  validateBulkOrderStatusBody,
};
