describe("event -> automation -> webhook integration", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should trigger automation and app webhook delivery from central listeners", async () => {
    const handlers = {};
    jest.doMock("@/core/infrastructure", () => ({
      eventBus: {
        on: jest.fn((eventName, handler) => {
          handlers[eventName] = handler;
        }),
      },
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
      },
    }));
    jest.doMock("../modules/automation/automationEvents.listener", () => ({
      registerAutomationEventListeners: jest.fn(),
    }));
    jest.doMock("../modules/app-marketplace/webhookDelivery.service", () => ({
      deliverEvent: jest.fn().mockResolvedValue([]),
    }));

    const listenerModule = require("../infrastructure/events/listeners");
    const webhookDelivery = require("../modules/app-marketplace/webhookDelivery.service");
    const automationListener = require("../modules/automation/automationEvents.listener");

    expect(listenerModule).toBeDefined();
    expect(automationListener.registerAutomationEventListeners).toHaveBeenCalled();

    await handlers.ORDER_CREATED({ shopId: "shop-1", orderId: "order-1" });
    expect(webhookDelivery.deliverEvent).toHaveBeenCalledWith({
      eventName: "ORDER_CREATED",
      payload: { shopId: "shop-1", orderId: "order-1" },
    });
  });
});
