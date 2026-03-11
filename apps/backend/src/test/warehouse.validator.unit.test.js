const validator = require("../modules/warehouse/warehouse.validator");

describe("warehouse.validator", () => {
  it("should reject invalid transfer body", () => {
    const result = validator.validateTransferBody({
      productId: "",
      fromWarehouseId: "w1",
      toWarehouseId: "w1",
      quantity: 0,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("productId is required");
    expect(result.errors).toContain("quantity must be >= 1");
    expect(result.errors).toContain("fromWarehouseId and toWarehouseId must be different");
  });

  it("should accept valid warehouse body", () => {
    const result = validator.validateWarehouseBody({
      name: "Warehouse A",
      type: "WAREHOUSE",
    });
    expect(result.valid).toBe(true);
  });
});
