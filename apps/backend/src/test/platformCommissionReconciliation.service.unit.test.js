jest.mock("../models/ReconciliationReport", () => ({
  findOneAndUpdate: jest.fn(),
  find: jest.fn(),
}));

jest.mock("../modules/billing/platformCommissionReport.service", () => ({
  getCommissionReconciliation: jest.fn(),
}));

const ReconciliationReport = require("../models/ReconciliationReport");
const reportService = require("../modules/billing/platformCommissionReport.service");
const service = require("../services/platformCommissionReconciliation.service");

describe("platformCommissionReconciliation.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should persist daily platform commission reconciliation", async () => {
    reportService.getCommissionReconciliation.mockResolvedValue({
      settlementCommission: 100,
      ledgerCommission: 90,
      merchantDirectCount: 2,
      ledgerEntries: 3,
      difference: 10,
      status: "MISMATCH",
      settlementCount: 4,
    });
    ReconciliationReport.findOneAndUpdate.mockResolvedValue({ _id: "rep-1", status: "MISMATCH" });

    const row = await service.runPlatformCommissionReconciliation("2026-03-11");

    expect(ReconciliationReport.findOneAndUpdate).toHaveBeenCalled();
    expect(row.status).toBe("MISMATCH");
  });

  it("should list saved platform commission reconciliations", async () => {
    ReconciliationReport.find.mockReturnValue({
      sort: () => ({
        limit: () => ({
          lean: async () => [{ date: "2026-03-11" }],
        }),
      }),
    });

    const rows = await service.listPlatformCommissionReconciliations(10);
    expect(rows).toHaveLength(1);
  });
});
