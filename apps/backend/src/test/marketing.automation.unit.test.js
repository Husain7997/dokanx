jest.mock("../modules/marketing/models/automationRule.model", () => ({
  find: jest.fn(),
}));

jest.mock("../modules/marketing/models/automationExecution.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
}));

const AutomationRule = require("../modules/marketing/models/automationRule.model");
const AutomationExecution = require("../modules/marketing/models/automationExecution.model");
const service = require("../modules/marketing/marketing.service");

describe("marketing automation execution", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should execute matching automation rules", async () => {
    AutomationRule.find.mockReturnValue({
      lean: async () => [
        {
          _id: "rule-1",
          trigger: "WELCOME",
          channel: "EMAIL",
          actionType: "COUPON",
          delayMinutes: 0,
          template: { subject: "Welcome", body: "Hello" },
          audience: { minOrders: 0, inactiveDays: 0 },
          reward: { couponCode: "WELCOME10", discountValue: 10 },
        },
      ],
    });
    AutomationExecution.create.mockImplementation(async payload => payload);

    const rows = await service.executeAutomationTrigger({
      shopId: "shop-1",
      trigger: "WELCOME",
      context: { customerOrders: 0 },
    });

    expect(rows[0].status).toBe("EXECUTED");
    expect(rows[0].result.reward.couponCode).toBe("WELCOME10");
  });

  it("should skip unmatched automation rules", async () => {
    AutomationRule.find.mockReturnValue({
      lean: async () => [
        {
          _id: "rule-2",
          trigger: "REENGAGEMENT",
          channel: "SMS",
          actionType: "MESSAGE",
          delayMinutes: 60,
          template: { subject: "", body: "Come back" },
          audience: { minOrders: 2, inactiveDays: 30 },
          reward: {},
        },
      ],
    });
    AutomationExecution.create.mockImplementation(async payload => payload);

    const rows = await service.executeAutomationTrigger({
      shopId: "shop-1",
      trigger: "REENGAGEMENT",
      context: { customerOrders: 1, customerInactiveDays: 10 },
    });

    expect(rows[0].status).toBe("SKIPPED");
  });
});
