const validator = require("../modules/marketing/marketing.validator");

describe("marketing.validator", () => {
  it("should reject invalid percentage coupon payload", () => {
    const result = validator.validateCouponBody({
      code: "save20",
      type: "PERCENTAGE",
      value: 150,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("value must be <= 100 for percentage coupons");
  });

  it("should accept valid automation body", () => {
    const result = validator.validateAutomationBody({
      name: "Welcome flow",
      trigger: "WELCOME",
      channel: "EMAIL",
      actionType: "COUPON",
      delayMinutes: 10,
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
