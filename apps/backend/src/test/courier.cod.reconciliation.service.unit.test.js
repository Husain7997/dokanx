const service = require("../modules/courier/courier.cod.reconciliation.service");

describe("courier COD reconciliation service", () => {
  it("maps provider-specific statuses", () => {
    expect(service.mapProviderShipmentStatus("pathao", "on_the_way")).toBe("OUT_FOR_DELIVERY");
    expect(service.mapProviderShipmentStatus("redx", "parcel_received")).toBe("ORDER_PICKED");
  });

  it("detects COD mismatches and delays", () => {
    const result = service.reconcileCodCollections(
      [
        {
          _id: "sh-1",
          orderId: "ord-1",
          courier: "PATHAO",
          status: "OUT_FOR_DELIVERY",
          cashOnDeliveryAmount: 500,
          codCollectedAmount: 300,
          updatedAt: "2026-03-08T00:00:00.000Z",
        },
      ],
      {
        toleranceAmount: 20,
        delayThresholds: {
          now: "2026-03-12T00:00:00.000Z",
          warningHours: 24,
          criticalHours: 48,
        },
      }
    );

    expect(result.summary.codMismatchCount).toBe(1);
    expect(result.summary.delayedShipmentCount).toBe(1);
    expect(result.performance[0].courier).toBe("PATHAO");
  });
});
