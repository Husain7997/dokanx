const orderValidator = require("../validators/order.validator");
const paymentValidator = require("../validators/payment.validator");

describe("order and payment validators", () => {
  it("should reject invalid place-order payload", () => {
    const result = orderValidator.validatePlaceOrderBody({
      items: [],
      totalAmount: -1,
      shippingFee: -2,
      couponCode: "   ",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("items must be a non-empty array");
    expect(result.errors).toContain("totalAmount must be a valid positive number");
    expect(result.errors).toContain("shippingFee must be a valid positive number");
    expect(result.errors).toContain("couponCode must not be empty");
  });

  it("should accept valid payment initiate payload", () => {
    const result = paymentValidator.validateInitiatePaymentBody({
      paymentMethod: "bkash",
      hasOwnGateway: true,
    });

    expect(result).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("should reject invalid refund payload", () => {
    const result = paymentValidator.validateRefundPaymentBody({
      orderId: "",
      amount: 0,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("orderId is required");
    expect(result.errors).toContain("amount must be greater than 0");
  });
});
