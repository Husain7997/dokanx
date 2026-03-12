jest.mock("../models/shop.model", () => ({
  countDocuments: jest.fn(),
}));

jest.mock("../models/order.model", () => ({
  countDocuments: jest.fn(),
}));

jest.mock("../models/wallet.model", () => ({
  find: jest.fn(),
}));

jest.mock("../models/settlement.model", () => ({
  find: jest.fn(),
}));

jest.mock("../modules/ledger/ledger.model", () => ({
  countDocuments: jest.fn(),
}));

jest.mock("../modules/automation/automation.service", () => ({
  getDashboard: jest.fn(),
}));

jest.mock("../modules/app-marketplace/webhookDelivery.service", () => ({
  listDeadLetters: jest.fn(),
}));

jest.mock("../modules/courier/courier.service", () => ({
  getCourierDashboard: jest.fn(),
}));

const Shop = require("../models/shop.model");
const Order = require("../models/order.model");
const Wallet = require("../models/wallet.model");
const Settlement = require("../models/settlement.model");
const Ledger = require("../modules/ledger/ledger.model");
const automationService = require("../modules/automation/automation.service");
const webhookDeliveryService = require("../modules/app-marketplace/webhookDelivery.service");
const courierService = require("../modules/courier/courier.service");
const controller = require("../controllers/admin.metrics.controller");

describe("admin.metrics.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Wallet.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });
    Settlement.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }),
    });
    Ledger.countDocuments.mockResolvedValue(0);
  });

  it("should return core metrics", async () => {
    Shop.countDocuments.mockResolvedValue(2);
    Order.countDocuments.mockResolvedValue(5);
    const res = { json: jest.fn() };

    await controller.metrics({}, res);

    expect(res.json).toHaveBeenCalledWith({ shops: 2, orders: 5 });
  });

  it("should return automation metrics", async () => {
    automationService.getDashboard.mockResolvedValue({ recentTasks: [] });
    const req = { query: { shopId: " shop-1 ", limit: "5" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await controller.automationMetrics(req, res, next);

    expect(automationService.getDashboard).toHaveBeenCalledWith({
      shopId: "shop-1",
      limit: "5",
    });
    expect(res.json).toHaveBeenCalledWith({ data: { recentTasks: [] } });
  });

  it("should return consolidated operations metrics", async () => {
    automationService.getDashboard.mockResolvedValue({ recentTasks: [] });
    webhookDeliveryService.listDeadLetters.mockResolvedValue([{ _id: "dead-1" }]);
    courierService.getCourierDashboard.mockResolvedValue({ statusBreakdown: [] });
    courierService.listCourierAnomalies = jest.fn().mockResolvedValue([{ type: "DELIVERY_DELAY" }]);
    Wallet.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { balance: 100, withdrawable_balance: 50, pending_settlement: 20, status: "FROZEN", isFrozen: true },
      ]),
    });
    Settlement.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ payoutStatus: "FAILED" }]),
        }),
      }),
    });
    Ledger.countDocuments.mockResolvedValue(3);
    const req = { query: { shopId: "shop-1", limit: "5" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await controller.operationsMetrics(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      data: {
        automation: { recentTasks: [] },
        appWebhooks: {
          deadLetterCount: 1,
          deadLetters: [{ _id: "dead-1" }],
        },
        courier: { statusBreakdown: [], anomalies: [{ type: "DELIVERY_DELAY" }] },
        finance: expect.objectContaining({
          ledgerEntries: 3,
          anomalies: expect.arrayContaining([
            expect.objectContaining({ type: "FROZEN_WALLETS", severity: "MEDIUM" }),
            expect.objectContaining({ type: "PAYOUT_ALERTS", severity: "MEDIUM" }),
          ]),
        }),
      },
    });
  });
});
