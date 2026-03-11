jest.mock("../models/settlement.model", () => ({
  aggregate: jest.fn(),
}));

jest.mock("../modules/ledger/ledger.model", () => ({
  aggregate: jest.fn(),
  find: jest.fn(),
}));

jest.mock("../modules/billing/platformCommissionReport.service", () => ({
  getCommissionReconciliation: jest.fn(),
  listCommissionEntries: jest.fn(),
  buildCommissionExportRows: jest.fn(),
}));

const Settlement = require("../models/settlement.model");
const Ledger = require("../modules/ledger/ledger.model");
const reportService = require("../modules/billing/platformCommissionReport.service");
const controller = require("../controllers/admin/finance.controller");

function createRes() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe("platform billing reporting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return platform commission summary", async () => {
    reportService.getCommissionReconciliation.mockResolvedValue({
      settlementCommission: 150,
      merchantDirectCount: 2,
      settlementCount: 5,
      ledgerCommission: 140,
      ledgerEntries: 4,
      difference: 10,
      status: "MISMATCH",
    });

    const res = createRes();
    await controller.platformCommissionSummary({ query: {} }, res);

    expect(res.body.data.settlementCommission).toBe(150);
    expect(res.body.data.ledgerCommission).toBe(140);
  });

  it("should return platform commission entries", async () => {
    reportService.listCommissionEntries.mockResolvedValue([{ amount: 20 }]);

    const res = createRes();
    await controller.platformCommissionEntries({ query: { limit: 10 } }, res);

    expect(res.body.data).toHaveLength(1);
  });

  it("should export platform commission CSV", async () => {
    reportService.buildCommissionExportRows.mockResolvedValue([
      {
        createdAt: "2026-03-11",
        tenantId: "platform",
        amount: 20,
        type: "credit",
      },
    ]);

    const res = createRes();
    await controller.exportPlatformCommissionCSV({ query: {} }, res);

    expect(res.headers["Content-Type"]).toBe("text/csv");
    expect(res.headers["Content-Disposition"]).toContain("platform-commission.csv");
    expect(typeof res.body).toBe("string");
    expect(res.body).toContain("tenantId");
  });
});
