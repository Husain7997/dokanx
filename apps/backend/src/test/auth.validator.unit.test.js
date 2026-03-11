const validator = require("../modules/auth/auth.validator");

describe("auth.validator", () => {
  it("should reject invalid otp request body", () => {
    const result = validator.validateOtpRequestBody({ phone: "1234" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("phone must be a valid Bangladesh number");
  });

  it("should accept valid otp verify body", () => {
    const result = validator.validateOtpVerifyBody({
      phone: "01700000000",
      code: "123456",
    });

    expect(result.valid).toBe(true);
  });

  it("should require token for magic link verify", () => {
    const result = validator.validateMagicLinkVerifyBody({});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("token is required");
  });
});
