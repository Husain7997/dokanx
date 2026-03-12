const request = require("supertest");
const express = require("express");

jest.mock("@/middlewares", () => ({
  protect: (req, _res, next) => {
    req.user = { _id: "user-1", shopId: "shop-1", role: "admin" };
    next();
  },
  allowRoles: () => (_req, _res, next) => next(),
}));

jest.mock("@/middlewares/accessPolicy.middleware", () => ({
  tenantAccess: () => [
    (req, _res, next) => {
      req.user = { _id: "user-1", shopId: "shop-1", role: "OWNER" };
      req.shop = { _id: "shop-1" };
      next();
    },
  ],
}));

jest.mock("../modules/automation/automation.controller", () => ({
  createRule: jest.fn((req, res) => res.json({ ok: true })),
  listRules: jest.fn((req, res) => res.json({ ok: true })),
  executeTrigger: jest.fn((req, res) => res.json({ ok: true })),
  listLogs: jest.fn((req, res) => res.json({ ok: true })),
  listTasks: jest.fn((req, res) => res.json({ ok: true })),
  getLoyaltySummary: jest.fn((req, res) => res.json({ ok: true })),
  getDashboard: jest.fn((req, res) => res.json({ ok: true })),
}));

jest.mock("../modules/courier/courier.controller", () => ({
  createShipment: jest.fn((req, res) => res.json({ ok: true })),
  listShipments: jest.fn((req, res) => res.json({ ok: true })),
  getShipment: jest.fn((req, res) => res.json({ ok: true })),
  fetchShipmentStatus: jest.fn((req, res) => res.json({ ok: true })),
  dashboard: jest.fn((req, res) => res.json({ ok: true })),
  exportShipmentsCSV: jest.fn((req, res) => res.send("csv")),
  codMismatches: jest.fn((req, res) => res.json({ ok: true })),
  handleWebhook: jest.fn((req, res) => res.json({ ok: true })),
  reconcileCod: jest.fn((req, res) => res.json({ ok: true })),
}));

jest.mock("../controllers/admin/appMarketplace.controller", () => ({
  getWebhookDeadLetters: jest.fn((req, res) => res.json({ ok: true })),
}));

const automationController = require("../modules/automation/automation.controller");
const courierController = require("../modules/courier/courier.controller");
const adminAppMarketplaceController = require("../controllers/admin/appMarketplace.controller");
const automationRoutes = require("../modules/automation/automation.routes");
const courierRoutes = require("../modules/courier/courier.routes");
const adminAppMarketplaceRoutes = require("../routes/admin/app-marketplace.routes");

function buildApp(path, router) {
  const app = express();
  app.use(express.json());
  app.use(path, router);
  return app;
}

describe("new route validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reject invalid automation task query", async () => {
    const app = buildApp("/automation", automationRoutes);
    const res = await request(app).get("/automation/tasks?status=BAD");

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toContain("status is invalid");
    expect(automationController.listTasks).not.toHaveBeenCalled();
  });

  it("should reject invalid courier shipment status params", async () => {
    const app = buildApp("/courier", courierRoutes);
    const res = await request(app).get("/courier/shipments//status");

    expect(res.statusCode).toBe(404);
    expect(courierController.fetchShipmentStatus).not.toHaveBeenCalled();
  });

  it("should allow admin dead-letter inspection route", async () => {
    const app = buildApp("/admin", adminAppMarketplaceRoutes);
    const res = await request(app).get("/admin/apps/webhooks/dead-letter");

    expect(res.statusCode).toBe(200);
    expect(adminAppMarketplaceController.getWebhookDeadLetters).toHaveBeenCalled();
  });
});
