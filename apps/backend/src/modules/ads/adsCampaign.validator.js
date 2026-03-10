function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateCampaignIdParam(input) {
  const errors = [];
  const campaignId = String(input.campaignId || "").trim();
  if (!campaignId) errors.push("campaignId is required");
  return { valid: errors.length === 0, errors };
}

function validateCreateCampaignBody(input) {
  const errors = [];

  if (typeof input.name !== "string" || !input.name.trim()) {
    errors.push("name is required");
  }

  if (input.objective !== undefined) {
    const objective = String(input.objective).toUpperCase();
    if (!["AWARENESS", "TRAFFIC", "LEADS", "SALES"].includes(objective)) {
      errors.push("objective must be AWARENESS, TRAFFIC, LEADS or SALES");
    }
  }

  if (!isObject(input.platforms)) {
    errors.push("platforms is required and must be an object");
  } else {
    const p = input.platforms;
    const enabled =
      Boolean(p?.facebook?.enabled) || Boolean(p?.google?.enabled) || Boolean(p?.youtube?.enabled);
    if (!enabled) {
      errors.push("At least one platform must be enabled");
    }
  }

  if (input.budget !== undefined) {
    if (!isObject(input.budget)) {
      errors.push("budget must be an object");
    } else {
      if (input.budget.daily !== undefined) {
        const daily = Number(input.budget.daily);
        if (!Number.isFinite(daily) || daily < 0) errors.push("budget.daily must be a non-negative number");
      }
      if (input.budget.lifetime !== undefined) {
        const lifetime = Number(input.budget.lifetime);
        if (!Number.isFinite(lifetime) || lifetime < 0) {
          errors.push("budget.lifetime must be a non-negative number");
        }
      }
      if (input.budget.startDate !== undefined && Number.isNaN(new Date(input.budget.startDate).getTime())) {
        errors.push("budget.startDate must be a valid date");
      }
      if (input.budget.endDate !== undefined && Number.isNaN(new Date(input.budget.endDate).getTime())) {
        errors.push("budget.endDate must be a valid date");
      }
    }
  }

  if (input.creative !== undefined && !isObject(input.creative)) {
    errors.push("creative must be an object");
  }

  if (input.audience !== undefined) {
    if (!isObject(input.audience)) {
      errors.push("audience must be an object");
    } else {
      if (input.audience.ageMin !== undefined) {
        const ageMin = Number(input.audience.ageMin);
        if (!Number.isFinite(ageMin) || ageMin < 13 || ageMin > 100) {
          errors.push("audience.ageMin must be between 13 and 100");
        }
      }
      if (input.audience.ageMax !== undefined) {
        const ageMax = Number(input.audience.ageMax);
        if (!Number.isFinite(ageMax) || ageMax < 13 || ageMax > 100) {
          errors.push("audience.ageMax must be between 13 and 100");
        }
      }
      if (input.audience.ageMin !== undefined && input.audience.ageMax !== undefined) {
        if (Number(input.audience.ageMin) > Number(input.audience.ageMax)) {
          errors.push("audience.ageMin cannot be greater than audience.ageMax");
        }
      }
      if (input.audience.gender !== undefined) {
        const gender = String(input.audience.gender).toUpperCase();
        if (!["ALL", "MALE", "FEMALE"].includes(gender)) {
          errors.push("audience.gender must be ALL, MALE or FEMALE");
        }
      }
      if (input.audience.frequencyCapPerUserPerDay !== undefined) {
        const cap = Number(input.audience.frequencyCapPerUserPerDay);
        if (!Number.isFinite(cap) || cap < 1 || cap > 30) {
          errors.push("audience.frequencyCapPerUserPerDay must be between 1 and 30");
        }
      }
    }
  }

  if (input.smartBidding !== undefined) {
    if (!isObject(input.smartBidding)) {
      errors.push("smartBidding must be an object");
    } else {
      if (input.smartBidding.goalType !== undefined) {
        const goalType = String(input.smartBidding.goalType).toUpperCase();
        if (!["SALES", "LEADS"].includes(goalType)) {
          errors.push("smartBidding.goalType must be SALES or LEADS");
        }
      }
      if (input.smartBidding.strategy !== undefined) {
        const strategy = String(input.smartBidding.strategy).toUpperCase();
        if (!["MAX_CONVERSIONS", "TARGET_CPA", "TARGET_ROAS"].includes(strategy)) {
          errors.push("smartBidding.strategy must be MAX_CONVERSIONS, TARGET_CPA or TARGET_ROAS");
        }
      }
    }
  }

  if (input.couponTracking !== undefined) {
    if (!isObject(input.couponTracking)) {
      errors.push("couponTracking must be an object");
    } else if (
      input.couponTracking.couponCode !== undefined &&
      typeof input.couponTracking.couponCode !== "string"
    ) {
      errors.push("couponTracking.couponCode must be a string");
    }
  }

  if (input.guardrail !== undefined) {
    if (!isObject(input.guardrail)) {
      errors.push("guardrail must be an object");
    } else {
      if (input.guardrail.dailySpendLimit !== undefined) {
        const v = Number(input.guardrail.dailySpendLimit);
        if (!Number.isFinite(v) || v < 0) {
          errors.push("guardrail.dailySpendLimit must be a non-negative number");
        }
      }
      if (input.guardrail.anomalyThresholdPct !== undefined) {
        const v = Number(input.guardrail.anomalyThresholdPct);
        if (!Number.isFinite(v) || v < 1 || v > 500) {
          errors.push("guardrail.anomalyThresholdPct must be between 1 and 500");
        }
      }
    }
  }

  if (input.productIds !== undefined && !Array.isArray(input.productIds)) {
    errors.push("productIds must be an array");
  }

  return { valid: errors.length === 0, errors };
}

function validateListCampaignsQuery(input) {
  const errors = [];

  if (input.status !== undefined) {
    const status = String(input.status).toUpperCase();
    if (!["DRAFT", "QUEUED", "ACTIVE", "PAUSED", "COMPLETED", "FAILED"].includes(status)) {
      errors.push("status must be DRAFT, QUEUED, ACTIVE, PAUSED, COMPLETED or FAILED");
    }
  }

  if (input.objective !== undefined) {
    const objective = String(input.objective).toUpperCase();
    if (!["AWARENESS", "TRAFFIC", "LEADS", "SALES"].includes(objective)) {
      errors.push("objective must be AWARENESS, TRAFFIC, LEADS or SALES");
    }
  }

  if (input.platform !== undefined) {
    const platform = String(input.platform).toLowerCase();
    if (!["facebook", "google", "youtube"].includes(platform)) {
      errors.push("platform must be facebook, google or youtube");
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

function validateUpdateCampaignBody(input) {
  const errors = [];
  const allowed = [
    "name",
    "objective",
    "platforms",
    "budget",
    "creative",
    "audience",
    "smartBidding",
    "couponTracking",
    "guardrail",
    "productIds",
    "note",
  ];
  const keys = Object.keys(input || {});
  if (!keys.length) {
    errors.push("at least one updatable field is required");
    return { valid: false, errors };
  }
  if (keys.some(k => !allowed.includes(k))) {
    errors.push("payload contains unsupported fields");
  }

  const partial = validateCreateCampaignBody({
    ...input,
    name: input.name === undefined ? "tmp" : input.name,
    platforms: input.platforms === undefined ? { facebook: { enabled: true } } : input.platforms,
  });
  if (!partial.valid) {
    for (const err of partial.errors) {
      if (err === "name is required" && input.name === undefined) continue;
      if (err === "platforms is required and must be an object" && input.platforms === undefined) continue;
      if (err === "At least one platform must be enabled" && input.platforms === undefined) continue;
      errors.push(err);
    }
  }

  if (input.note !== undefined && typeof input.note !== "string") {
    errors.push("note must be a string");
  }

  return { valid: errors.length === 0, errors };
}

function validateCampaignStatusBody(input) {
  const errors = [];
  const status = String(input.status || "").toUpperCase();
  if (!["DRAFT", "QUEUED", "ACTIVE", "PAUSED", "COMPLETED", "FAILED"].includes(status)) {
    errors.push("status must be DRAFT, QUEUED, ACTIVE, PAUSED, COMPLETED or FAILED");
  }
  if (input.note !== undefined && typeof input.note !== "string") {
    errors.push("note must be a string");
  }
  return { valid: errors.length === 0, errors };
}

function validateMetricUpsertBody(input) {
  const errors = [];
  const numericFields = ["spend", "impressions", "reach", "clicks", "conversions", "revenue", "couponOrders"];
  for (const field of numericFields) {
    if (input[field] !== undefined) {
      const n = Number(input[field]);
      if (!Number.isFinite(n) || n < 0) {
        errors.push(`${field} must be a non-negative number`);
      }
    }
  }
  if (input.date !== undefined && Number.isNaN(new Date(input.date).getTime())) {
    errors.push("date must be a valid date");
  }
  return { valid: errors.length === 0, errors };
}

function validateAudienceSuggestionQuery(input) {
  const errors = [];
  if (input.days !== undefined) {
    const days = Number(input.days);
    if (!Number.isFinite(days) || days < 7 || days > 120) {
      errors.push("days must be between 7 and 120");
    }
  }
  return { valid: errors.length === 0, errors };
}

function validateFrequencyCapBody(input) {
  const errors = [];
  const cap = Number(input.frequencyCapPerUserPerDay);
  if (!Number.isFinite(cap) || cap < 1 || cap > 30) {
    errors.push("frequencyCapPerUserPerDay must be between 1 and 30");
  }
  return { valid: errors.length === 0, errors };
}

function validateLaunchApprovalRequestBody(input) {
  const errors = [];
  if (input.reason !== undefined && typeof input.reason !== "string") {
    errors.push("reason must be a string");
  }
  return { valid: errors.length === 0, errors };
}

function validateLaunchApprovalDecisionBody(input) {
  const errors = [];
  if (input.checkerComment !== undefined && typeof input.checkerComment !== "string") {
    errors.push("checkerComment must be a string");
  }
  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateCampaignIdParam,
  validateCreateCampaignBody,
  validateListCampaignsQuery,
  validateUpdateCampaignBody,
  validateCampaignStatusBody,
  validateMetricUpsertBody,
  validateAudienceSuggestionQuery,
  validateFrequencyCapBody,
  validateLaunchApprovalRequestBody,
  validateLaunchApprovalDecisionBody,
};
