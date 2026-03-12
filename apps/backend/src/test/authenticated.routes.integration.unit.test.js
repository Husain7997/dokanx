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

jest.mock("../modules/app-marketplace/appMarketplace.controller", () => ({
  listApps: jest.fn((req, res) => res.json({ ok: "apps" })),
  ensureDeveloperProfile: jest.fn((req, res) => res.json({ ok: true })),
  createApp: jest.fn((req, res) => res.json({ ok: true })),
  installApp: jest.fn((req, res) => res.json({ ok: true })),
  listInstallations: jest.fn((req, res) => res.json({ ok: true })),
  authorize: jest.fn((req, res) => res.json({ ok: true })),
  exchangeToken: jest.fn((req, res) => res.json({ ok: true })),
  createWebhook: jest.fn((req, res) => res.json({ ok: true })),
  listWebhooks: jest.fn((req, res) => res.json({ ok: true })),
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

const appMarketplaceRoutes = require("../modules/app-marketplace/appMarketplace.routes");
const automationRoutes = require("../modules/automation/automation.routes");
const courierRoutes = require("../modules/courier/courier.routes");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/apps", appMarketplaceRoutes);
  app.use("/automation", automationRoutes);
  app.use("/courier", courierRoutes);
  return app;
}

describe("authenticated route integration", () => {
  it("should serve apps list", async () => {
    const res = await request(buildApp()).get("/apps");
    expect(res.statusCode).toBe(200);
  });

  it("should serve automation dashboard", async () => {
    const res = await request(buildApp()).get("/automation/dashboard");
    expect(res.statusCode).toBe(200);
  });

  it("should serve courier shipment status", async () => {
    const res = await request(buildApp()).get("/courier/shipments/shipment-1/status");
    expect(res.statusCode).toBe(200);
  });
});
