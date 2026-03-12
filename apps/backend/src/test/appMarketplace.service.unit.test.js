jest.mock("../modules/app-marketplace/models/app.model", () => ({
  find: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("../modules/app-marketplace/models/developer.model", () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

jest.mock("../modules/app-marketplace/models/appInstallation.model", () => ({
  findOneAndUpdate: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("../modules/app-marketplace/models/appToken.model", () => ({
  create: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("../modules/app-marketplace/webhookDelivery.service", () => ({
  registerWebhook: jest.fn(),
  listWebhooks: jest.fn(),
}));

jest.mock("../models/audit.model", () => ({
  create: jest.fn(),
}));

const MarketplaceApp = require("../modules/app-marketplace/models/app.model");
const MarketplaceDeveloper = require("../modules/app-marketplace/models/developer.model");
const AppInstallation = require("../modules/app-marketplace/models/appInstallation.model");
const AppToken = require("../modules/app-marketplace/models/appToken.model");
const AuditLog = require("../models/audit.model");
const webhookDelivery = require("../modules/app-marketplace/webhookDelivery.service");
const service = require("../modules/app-marketplace/appMarketplace.service");

describe("appMarketplace.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create developer profile", async () => {
    MarketplaceDeveloper.findOneAndUpdate.mockResolvedValue({ _id: "dev-1", name: "Dev" });

    const row = await service.ensureDeveloperProfile({
      userId: "user-1",
      payload: { name: "Dev", email: "dev@example.com" },
    });

    expect(row._id).toBe("dev-1");
    expect(MarketplaceDeveloper.findOneAndUpdate).toHaveBeenCalled();
    expect(AuditLog.create).toHaveBeenCalled();
  });

  it("should install published app with allowed permissions only", async () => {
    MarketplaceApp.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: "app-1",
        permissions: ["read_orders", "write_products"],
        status: "PUBLISHED",
      }),
    });
    AppInstallation.findOneAndUpdate.mockResolvedValue({ _id: "install-1", status: "ACTIVE" });

    const row = await service.installApp({
      shopId: "shop-1",
      actorId: "user-1",
      appId: "app-1",
      payload: { permissions: ["read_orders", "read_wallet"] },
    });

    expect(row.status).toBe("ACTIVE");
    expect(AppInstallation.findOneAndUpdate).toHaveBeenCalledWith(
      { shopId: "shop-1", appId: "app-1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          grantedPermissions: ["read_orders"],
        }),
      }),
      { upsert: true, returnDocument: "after" }
    );
    expect(AuditLog.create).toHaveBeenCalled();
  });

  it("should exchange authorization code for access token", async () => {
    MarketplaceApp.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: "app-1",
        oauth: {
          clientId: "client-1",
          clientSecretHash: service._internals.hashToken("secret-1"),
        },
      }),
    });

    AppToken.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        appId: "app-1",
        shopId: "shop-1",
        installationId: "install-1",
        scopes: ["read_orders"],
        redirectUri: "https://example.com/callback",
        actorId: "user-1",
        consumedAt: null,
        save: jest.fn().mockResolvedValue(true),
      }),
    });
    AppToken.create.mockResolvedValue(true);

    const token = await service.exchangeToken({
      payload: {
        appId: "app-1",
        clientId: "client-1",
        clientSecret: "secret-1",
        code: "raw-code",
      },
    });

    expect(token.tokenType).toBe("Bearer");
    expect(token.scopes).toEqual(["read_orders"]);
    expect(AppToken.create).toHaveBeenCalled();
  });

  it("should register app webhook for active installation", async () => {
    AppInstallation.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: "install-1", status: "ACTIVE" }),
    });
    webhookDelivery.registerWebhook.mockResolvedValue({
      webhook: { _id: "webhook-1" },
      secret: "secret-1",
    });

    const row = await service.createWebhook({
      shopId: "shop-1",
      actorId: "user-1",
      appId: "app-1",
      payload: {
        eventName: "ORDER_CREATED",
        targetUrl: "https://example.com/hook",
      },
    });

    expect(row.secret).toBe("secret-1");
    expect(webhookDelivery.registerWebhook).toHaveBeenCalled();
    expect(AuditLog.create).toHaveBeenCalled();
  });
});
