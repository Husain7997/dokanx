const validator = require("../modules/courier/courier.validator");

describe("courier.validator", () => {
  it("should reject invalid shipment body", () => {
    const result = validator.validateCreateShipmentBody({
      orderId: "",
      courier: "unknown",
      recipient: {},
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("orderId is required");
    expect(result.errors).toContain("courier is invalid");
  });

  it("should accept valid webhook body", () => {
    const result = validator.validateWebhookBody({
      courier: "pathao",
      trackingCode: "PAT-123",
      event: "DELIVERED",
      codCollectedAmount: 300,
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
