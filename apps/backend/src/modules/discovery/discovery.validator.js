function validateSearchQuery(input) {
  const errors = [];

  if (input.q !== undefined && typeof input.q !== "string") {
    errors.push("q must be a string");
  }

  if (input.lat !== undefined) {
    const lat = Number(input.lat);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      errors.push("lat must be a number between -90 and 90");
    }
  }

  if (input.lng !== undefined) {
    const lng = Number(input.lng);
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      errors.push("lng must be a number between -180 and 180");
    }
  }

  if (input.radiusKm !== undefined) {
    const r = Number(input.radiusKm);
    if (!Number.isFinite(r) || r <= 0 || r > 100) {
      errors.push("radiusKm must be between 0 and 100");
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

module.exports = {
  validateSearchQuery,
};
