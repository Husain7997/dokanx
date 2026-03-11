const validator = require("../modules/cart/cart.validator");

describe("cart.validator", () => {
  it("should reject invalid cart item payload", () => {
    const result = validator.validateSaveCartBody({
      items: [{ productId: "", quantity: 0 }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should accept valid merge payload", () => {
    const result = validator.validateMergeBody({
      guestToken: "cart_123",
    });

    expect(result.valid).toBe(true);
  });
});
