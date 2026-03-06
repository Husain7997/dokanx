const {
  validateBody,
  validateQuery,
  validateParams,
} = require("../middlewares/validateRequest");

const catalogValidator = require("../modules/catalog/catalog.validator");
const creditValidator = require("../modules/credit/credit.validator");
const discoveryValidator = require("../modules/discovery/discovery.validator");
const behaviorValidator = require("../modules/behavior/behavior.validator");

function createMockRes() {
  const res = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };
  return res;
}

describe("Platform Validation - Catalog", () => {
  it("should reject suggest payload when both name and barcode are missing", () => {
    const result = catalogValidator.validateSuggest({ limit: 10 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Either name or barcode is required");
  });

  it("should accept suggest payload with valid name and limit", () => {
    const result = catalogValidator.validateSuggest({
      name: "Napa",
      limit: 10,
    });
    expect(result.valid).toBe(true);
  });

  it("should reject invalid decision action", () => {
    const result = catalogValidator.validateDecision({
      action: "UPSERT",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("action must be ACCEPT, EDIT or IGNORE");
  });
});

describe("Platform Validation - Credit", () => {
  it("should reject register customer without phone", () => {
    const result = creditValidator.validateRegisterCustomer({
      name: "Customer",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("phone is required");
  });

  it("should reject credit issue with non-positive amount", () => {
    const result = creditValidator.validateIssueOrPayment({
      customerId: "abc",
      amount: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("amount must be greater than 0");
  });

  it("should accept valid policy payload", () => {
    const result = creditValidator.validatePolicy({
      allowCredit: true,
      autoBlockCustomer: false,
      defaultLimit: 5000,
      maxOverdueDays: 30,
    });
    expect(result.valid).toBe(true);
  });
});

describe("Platform Validation - Discovery", () => {
  it("should reject invalid latitude", () => {
    const result = discoveryValidator.validateSearchQuery({
      q: "napa",
      lat: 300,
      lng: 90.4,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("lat must be a number between -90 and 90");
  });

  it("should accept valid geo query", () => {
    const result = discoveryValidator.validateSearchQuery({
      q: "napa",
      lat: 23.8,
      lng: 90.4,
      radiusKm: 10,
      limit: 20,
    });
    expect(result.valid).toBe(true);
  });
});

describe("Platform Validation - Behavior", () => {
  it("should reject invalid severity", () => {
    const result = behaviorValidator.validateSignalsQuery({
      severity: "CRITICAL",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("severity must be LOW, MEDIUM or HIGH");
  });

  it("should accept valid behavior signal filters", () => {
    const result = behaviorValidator.validateSignalsQuery({
      severity: "HIGH",
      resolved: "false",
      limit: 50,
    });
    expect(result.valid).toBe(true);
  });
});

describe("validateRequest Middleware", () => {
  it("validateBody should return 400 on invalid payload", () => {
    const middleware = validateBody(() => ({
      valid: false,
      errors: ["invalid body"],
    }));

    const req = { body: {} };
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.payload.success).toBe(false);
    expect(res.payload.errors).toContain("invalid body");
  });

  it("validateQuery should call next on valid payload", () => {
    const middleware = validateQuery(() => ({ valid: true, errors: [] }));

    const req = { query: { q: "napa" } };
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("validateParams should return 400 on invalid params", () => {
    const middleware = validateParams(() => ({
      valid: false,
      errors: ["missing id"],
    }));

    const req = { params: {} };
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.payload.errors).toContain("missing id");
  });
});
