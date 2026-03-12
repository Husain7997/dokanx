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
}));

jest.mock("../modules/automation/models/loyaltyPointLedger.model", () => ({
  find: jest.fn(),
  aggregate: jest.fn(),
}));

jest.mock("../modules/automation/actionExecutor", () => ({
  executeAction: jest.fn(async ({ action }) => ({
    type: action.type,
    status: "EXECUTED",
  })),
}));

const AutomationTask = require("../modules/automation/models/automationTask.model");
const LoyaltyPointLedger = require("../modules/automation/models/loyaltyPointLedger.model");
const service = require("../modules/automation/automation.service");

describe("automation read services", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should list tasks by shop", async () => {
    AutomationTask.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ _id: "task-1", status: "OPEN" }]),
        }),
      }),
    });

    const rows = await service.listTasks({ shopId: "shop-1", status: "OPEN" });
    expect(rows).toHaveLength(1);
  });

  it("should return loyalty summary", async () => {
    LoyaltyPointLedger.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ _id: "lp-1", points: 50 }]),
        }),
      }),
    });
    LoyaltyPointLedger.aggregate.mockResolvedValue([{ totalPoints: 50, count: 1 }]);

    const result = await service.getLoyaltySummary({ shopId: "shop-1" });
    expect(result.totalPoints).toBe(50);
    expect(result.entries).toHaveLength(1);
  });

  it("should return automation dashboard", async () => {
    AutomationTask.aggregate = jest.fn().mockResolvedValue([{ _id: "OPEN", count: 2 }]);
    AutomationTask.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ _id: "task-1" }]),
        }),
      }),
    });
    LoyaltyPointLedger.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ _id: "lp-1" }]),
        }),
      }),
    });
    LoyaltyPointLedger.aggregate.mockResolvedValue([{ totalPoints: 100, customerCount: 2 }]);

    const result = await service.getDashboard({ shopId: "shop-1" });
    expect(result.loyalty.totalPoints).toBe(100);
    expect(result.recentTasks).toHaveLength(1);
  });
});
