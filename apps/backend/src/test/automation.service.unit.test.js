jest.mock("../modules/automation/models/automationRule.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
}));

jest.mock("../modules/automation/models/automationLog.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
}));

jest.mock("../modules/automation/actionExecutor", () => ({
  executeAction: jest.fn(async ({ action }) => ({
    type: action.type,
    status: "EXECUTED",
  })),
}));

const AutomationRule = require("../modules/automation/models/automationRule.model");
const AutomationLog = require("../modules/automation/models/automationLog.model");
const service = require("../modules/automation/automation.service");

describe("automation.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should evaluate conditions correctly", () => {
    const matched = service._internals.evaluateConditions(
      [{ field: "orderAmount", operator: "GTE", value: 1000 }],
      { orderAmount: 1500 }
    );

    expect(matched).toBe(true);
  });

  it("should execute matching automation rules", async () => {
    AutomationRule.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        {
          _id: "rule-1",
          conditions: [{ field: "stock", operator: "LTE", value: 5 }],
          actions: [{ type: "SEND_SMS", template: { body: "Low stock" } }],
        },
      ]),
    });
    AutomationLog.create.mockImplementation(async payload => payload);

    const rows = await service.executeTrigger({
      shopId: "shop-1",
      trigger: "LOW_STOCK",
      context: { stock: 3 },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("EXECUTED");
  });
});
