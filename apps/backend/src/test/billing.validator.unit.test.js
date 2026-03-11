const validator = require("../modules/billing/billing.validator");

describe("billing.validator", () => {
  it("should reject invalid plan body", () => {
    const result = validator.validatePlanBody({
      name: "",
      commissionRate: 120,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("name is required");
    expect(result.errors).toContain("commissionRate must be <= 100");
  });

  it("should accept valid commission rule body", () => {
    const result = validator.validateCommissionRuleBody({
      name: "Online Rule",
      rate: 5,
      orderChannel: "ONLINE",
    });

    expect(result.valid).toBe(true);
  });

  it("should reject invalid sms pack body", () => {
    const result = validator.validateSmsPackBody({
      name: "",
      credits: 0,
      price: -1,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("name is required");
    expect(result.errors).toContain("credits must be >= 1");
  });
});
