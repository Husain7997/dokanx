const validator = require("../modules/support/support.validator");

describe("support.validator", () => {
  it("should reject empty create ticket payload", () => {
    const result = validator.validateCreateTicketBody({});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("subject is required");
    expect(result.errors).toContain("description is required");
  });

  it("should accept valid ticket query", () => {
    const result = validator.validateTicketQuery({
      status: "open",
      priority: "high",
      limit: 20,
    });
    expect(result.valid).toBe(true);
  });
});
