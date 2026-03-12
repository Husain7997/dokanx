jest.mock("../platform/events/event.publisher", () => ({
  publishDomainEvent: jest.fn(async payload => payload),
}));

jest.mock("../core/infrastructure", () => ({
  addJob: jest.fn(async payload => payload),
}));

jest.mock("../intelligence/intelligenceTelemetry.service", () => ({
  recordIntelligenceMetric: jest.fn(async payload => payload),
}));

const service = require("../intelligence/automationAI.service");

describe("growth automation engine 2.0", () => {
  it("creates AI-triggered automation tasks", async () => {
    const created = [];
    const result = await service.executeAutomationTriggers({
      shopId: "shop-1",
      models: {
        AutomationTask: {
          create: jest.fn(async payload => {
            created.push(payload);
            return { _id: `task-${created.length}`, ...payload };
          }),
        },
      },
      triggers: [
        { type: "CART_ABANDONED", customerId: "cust-1" },
        { type: "CUSTOMER_INACTIVE_30_DAYS", customerId: "cust-2" },
        { type: "SLOW_MOVING_INVENTORY", productId: "prod-1", inventoryDaysCover: 40, salesTrendPct: -20 },
      ],
    });

    expect(result.createdCount).toBe(3);
    expect(result.tasks[0].title).toMatch(/AI/i);
  });
});
