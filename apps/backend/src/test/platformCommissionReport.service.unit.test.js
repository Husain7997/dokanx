jest.mock("../modules/ledger/ledger.model", () => ({
  aggregate: jest.fn(),
  find: jest.fn(),
}));

jest.mock("../models/settlement.model", () => ({
  aggregate: jest.fn(),
}));

const Ledger = require("../modules/ledger/ledger.model");
const Settlement = require("../models/settlement.model");
const service = require("../modules/billing/platformCommissionReport.service");

describe("platformCommissionReport.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return matched reconciliation", async () => {
    Settlement.aggregate.mockResolvedValue([
      { settlementCommission: 100, settlementCount: 4, merchantDirectCount: 1 },
    ]);
    Ledger.aggregate.mockResolvedValue([
      { ledgerCommission: 100, ledgerEntries: 2 },
    ]);

    const row = await service.getCommissionReconciliation({});

    expect(row.status).toBe("MATCHED");
    expect(row.difference).toBe(0);
  });

  it("should build export rows", async () => {
    Ledger.find.mockReturnValue({
      sort: () => ({
        limit: () => ({
          lean: async () => [
            {
              createdAt: "2026-03-11",
              shopId: "platform",
              amount: 20,
              type: "credit",
              referenceId: "ref-1",
              meta: {
                sourceTenantId: "shop-1",
                orderId: "order-1",
                attemptId: "attempt-1",
                reason: "platform_commission_credit",
              },
            },
          ],
        }),
      }),
    });

    const rows = await service.buildCommissionExportRows({});
    expect(rows).toHaveLength(1);
    expect(rows[0].sourceTenantId).toBe("shop-1");
  });

  it("should clamp entry list limit", async () => {
    const limit = jest.fn(() => ({
      lean: async () => [],
    }));
    Ledger.find.mockReturnValue({
      sort: () => ({
        limit,
      }),
    });

    await service.listCommissionEntries({ limit: 9999 });

    expect(limit).toHaveBeenCalledWith(500);
  });
});
