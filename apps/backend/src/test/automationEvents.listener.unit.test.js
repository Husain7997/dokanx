describe("automationEvents.listener", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should register mapped event listeners", () => {
    jest.doMock("@/core/infrastructure", () => ({
      eventBus: { on: jest.fn() },
      logger: { warn: jest.fn() },
    }));
    jest.doMock("../modules/automation/automation.service", () => ({
      executeTrigger: jest.fn(),
    }));

    const { eventBus } = require("@/core/infrastructure");
    const listener = require("../modules/automation/automationEvents.listener");

    listener.registerAutomationEventListeners();
    expect(eventBus.on).toHaveBeenCalled();
  });

  it("should execute automation trigger for registered event", async () => {
    const handlers = {};
    jest.doMock("@/core/infrastructure", () => ({
      eventBus: {
        on: jest.fn((eventName, handler) => {
          handlers[eventName] = handler;
        }),
      },
      logger: { warn: jest.fn() },
    }));
    jest.doMock("../modules/automation/automation.service", () => ({
      executeTrigger: jest.fn(),
    }));

    const automationService = require("../modules/automation/automation.service");
    const listener = require("../modules/automation/automationEvents.listener");

    listener.registerAutomationEventListeners();
    await handlers.ORDER_CREATED({ shopId: "shop-1", orderId: "order-1" });

    expect(automationService.executeTrigger).toHaveBeenCalledWith({
      shopId: "shop-1",
      trigger: "ORDER_CREATED",
      context: expect.objectContaining({ shopId: "shop-1", orderId: "order-1" }),
    });
  });
});
