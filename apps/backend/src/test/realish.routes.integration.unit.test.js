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

jest.mock("../modules/app-marketplace/appMarketplace.service", () => ({
  listApps: jest.fn().mockResolvedValue([{ _id: "app-1" }]),
  ensureDeveloperProfile: jest.fn(),
  createApp: jest.fn(),
  installApp: jest.fn(),
  listInstallations: jest.fn(),
  authorizeApp: jest.fn(),
  exchangeToken: jest.fn(),
  createWebhook: jest.fn(),
  listWebhooks: jest.fn(),
}));

jest.mock("../modules/automation/models/automationRule.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
}));
jest.mock("../modules/automation/models/automationLog.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
}));
jest.mock("../modules/automation/models/automationTask.model", () => ({
  find: jest.fn(),
  aggregate: jest.fn(),
}));
jest.mock("../modules/automation/models/loyaltyPointLedger.model", () => ({
  find: jest.fn(),
  aggregate: jest.fn(),
}));
jest.mock("../modules/automation/actionExecutor", () => ({
  executeAction: jest.fn(),
}));

jest.mock("../modules/courier/models/courierShipment.model", () => ({
  findOne: jest.fn(),
}));
jest.mock("../modules/courier/courierProviderRegistry", () => ({
  getProvider: jest.fn(),
}));

const appService = require("../modules/app-marketplace/appMarketplace.service");
const AutomationTask = require("../modules/automation/models/automationTask.model");
const LoyaltyPointLedger = require("../modules/automation/models/loyaltyPointLedger.model");
const CourierShipment = require("../modules/courier/models/courierShipment.model");
const { getProvider } = require("../modules/courier/courierProviderRegistry");

const appRoutes = require("../modules/app-marketplace/appMarketplace.routes");
const automationRoutes = require("../modules/automation/automation.routes");
const courierRoutes = require("../modules/courier/courier.routes");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/apps", appRoutes);
  app.use("/automation", automationRoutes);
  app.use("/courier", courierRoutes);
  app.use((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ message: err.message });
  });
  return app;
}

describe("realish route integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should run real apps list controller/service flow", async () => {
    const res = await request(buildApp()).get("/apps");

    expect(res.statusCode).toBe(200);
    expect(appService.listApps).toHaveBeenCalled();
  });

  it("should run real automation dashboard flow", async () => {
    AutomationTask.aggregate.mockResolvedValue([{ _id: "OPEN", count: 1 }]);
    AutomationTask.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ _id: "task-1" }]),
        }),
      }),
    });
    LoyaltyPointLedger.aggregate.mockResolvedValue([{ totalPoints: 10, customerCount: 1 }]);
    LoyaltyPointLedger.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ _id: "lp-1" }]),
        }),
      }),
    });

    const res = await request(buildApp()).get("/automation/dashboard");

    expect(res.statusCode).toBe(200);
    expect(res.body.data.loyalty.totalPoints).toBe(10);
  });

  it("should run real courier status flow", async () => {
    CourierShipment.findOne.mockResolvedValue({
      _id: "shipment-1",
      shopId: "shop-1",
      courier: "PATHAO",
      status: "CREATED",
      externalReference: "ext-1",
    });
    getProvider.mockReturnValue({
      fetchShipmentStatus: jest.fn().mockResolvedValue({
        provider: "PATHAO",
        normalizedResponse: { shipmentStatus: "IN_TRANSIT" },
      }),
    });

    const res = await request(buildApp()).get("/courier/shipments/shipment-1/status");

    expect(res.statusCode).toBe(200);
    expect(res.body.data.normalizedResponse.shipmentStatus).toBe("IN_TRANSIT");
  });
});
