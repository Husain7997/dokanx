const request = require("supertest");
const express = require("express");

jest.mock("../middlewares", () => ({
  protect: (_req, _res, next) => next(),
  allowRoles: () => (_req, _res, next) => next(),
}));

jest.mock("../controllers/admin/finance.controller", () => ({
  listFinances: jest.fn((req, res) => res.json({ ok: true })),
  settleFinance: jest.fn((req, res) => res.json({ ok: true })),
  kpiSummary: jest.fn((req, res) => res.json({ ok: true })),
  revenueVsPayout: jest.fn((req, res) => res.json({ ok: true })),
  topShops: jest.fn((req, res) => res.json({ ok: true })),
  payoutAlerts: jest.fn((req, res) => res.json({ ok: true })),
  platformCommissionSummary: jest.fn((req, res) => res.json({ ok: true })),
  platformCommissionEntries: jest.fn((req, res) => res.json({ ok: true })),
  exportPlatformCommissionCSV: jest.fn((req, res) => res.json({ ok: true })),
  exportSettlementsCSV: jest.fn((req, res) => res.json({ ok: true })),
}));

jest.mock("../controllers/admin/compliance.controller", () => ({
  lockPeriod: jest.fn((req, res) => res.json({ ok: true })),
  reconciliationReports: jest.fn((req, res) => res.json({ ok: true })),
  runPlatformCommissionReconciliation: jest.fn((req, res) => res.json({ ok: true })),
  platformCommissionReconciliationReports: jest.fn((req, res) => res.json({ ok: true })),
}));

jest.mock("../controllers/admin/tax.controller", () => ({
  listTaxRules: jest.fn((req, res) => res.json({ ok: true })),
  createTaxRule: jest.fn((req, res) => res.json({ ok: true })),
  updateTaxRule: jest.fn((req, res) => res.json({ ok: true })),
  vatSummary: jest.fn((req, res) => res.json({ ok: true })),
  exportVatCSV: jest.fn((req, res) => res.json({ ok: true })),
  getMushakInvoice: jest.fn((req, res) => res.json({ ok: true })),
}));

const financeController = require("../controllers/admin/finance.controller");
const complianceController = require("../controllers/admin/compliance.controller");
const taxController = require("../controllers/admin/tax.controller");
const financeRoutes = require("../routes/admin/finance.routes");
const complianceRoutes = require("../routes/admin/compliance.routes");
const taxRoutes = require("../routes/admin/tax.routes");

function buildApp(path, router) {
  const app = express();
  app.use(express.json());
  app.use(path, router);
  return app;
}

describe("admin route validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reject invalid finance settle payload", async () => {
    const app = buildApp("/finance", financeRoutes);
    const res = await request(app).post("/finance/settle").send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toContain("financeId is required");
    expect(financeController.settleFinance).not.toHaveBeenCalled();
  });

  it("should reject invalid platform commission query", async () => {
    const app = buildApp("/finance", financeRoutes);
    const res = await request(app).get("/finance/platform-commission/entries?limit=-5&from=bad");

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toContain("from is invalid");
    expect(res.body.errors).toContain("limit must be an integer >= 1");
    expect(financeController.platformCommissionEntries).not.toHaveBeenCalled();
  });

  it("should reject invalid compliance lock-period payload", async () => {
    const app = buildApp("/compliance", complianceRoutes);
    const res = await request(app).post("/compliance/lock-period").send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toContain("period is required");
    expect(complianceController.lockPeriod).not.toHaveBeenCalled();
  });

  it("should reject invalid platform reconciliation query", async () => {
    const app = buildApp("/compliance", complianceRoutes);
    const res = await request(app).get("/compliance/reconciliation/platform-commission?limit=1000");

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toContain("limit must be <= 100");
    expect(complianceController.platformCommissionReconciliationReports).not.toHaveBeenCalled();
  });

  it("should reject invalid tax rule body", async () => {
    const app = buildApp("/tax", taxRoutes);
    const res = await request(app).post("/tax").send({ name: "", type: "", rate: -1 });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toContain("name is required");
    expect(res.body.errors).toContain("type is required");
    expect(res.body.errors).toContain("rate must be >= 0");
    expect(taxController.createTaxRule).not.toHaveBeenCalled();
  });

  it("should reject invalid vat report query", async () => {
    const app = buildApp("/tax", taxRoutes);
    const res = await request(app).get("/tax/reports/vat-export?from=bad&limit=0");

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toContain("from is invalid");
    expect(res.body.errors).toContain("limit must be an integer >= 1");
    expect(taxController.exportVatCSV).not.toHaveBeenCalled();
  });
});
