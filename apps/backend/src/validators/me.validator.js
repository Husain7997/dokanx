function requireNonEmpty(field, value, errors) {
  if (!String(value || "").trim()) {
    errors.push(`${field} is required`);
  }
}

function validatePreferencesBody(body = {}) {
  const errors = [];

  if (body.addresses !== undefined && !Array.isArray(body.addresses)) {
    errors.push("addresses must be an array");
  }

  if (Array.isArray(body.addresses)) {
    body.addresses.forEach((item, index) => {
      requireNonEmpty(`addresses[${index}].label`, item?.label, errors);
      requireNonEmpty(`addresses[${index}].recipient`, item?.recipient, errors);
      requireNonEmpty(`addresses[${index}].line1`, item?.line1, errors);
      requireNonEmpty(`addresses[${index}].city`, item?.city, errors);
    });
  }

  if (body.savedPaymentMethods !== undefined && !Array.isArray(body.savedPaymentMethods)) {
    errors.push("savedPaymentMethods must be an array");
  }

  if (Array.isArray(body.savedPaymentMethods)) {
    body.savedPaymentMethods.forEach((item, index) => {
      requireNonEmpty(`savedPaymentMethods[${index}].label`, item?.label, errors);
      requireNonEmpty(`savedPaymentMethods[${index}].provider`, item?.provider, errors);
      requireNonEmpty(`savedPaymentMethods[${index}].accountRef`, item?.accountRef, errors);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validatePreferencesBody,
};
