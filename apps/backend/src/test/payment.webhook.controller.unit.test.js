jest.mock("../services/paymentProcessor.service", () => ({
  processSuccessfulPayment: jest.fn(),
}));

jest.mock("@/core/infrastructure", () => ({
  publishEvent: jest.fn(),
  logger: {
    error: jest.fn(),
  },
}));

const { processSuccessfulPayment } = require("../services/paymentProcessor.service");
const { publishEvent, logger } = require("@/core/infrastructure");
const controller = require("../controllers/payment.webhook.controller");

describe("payment.webhook.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should acknowledge gateway webhook after processing", async () => {
    const res = {
      json: jest.fn(),
      status: jest.fn(() => ({ json: jest.fn() })),
    };

    await controller.gatewayWebhook(
      {
        body: {
          payment_id: "pay-1",
          event_id: "evt-1",
          order_id: "order-1",
        },
      },
      res
    );

    expect(processSuccessfulPayment).toHaveBeenCalledWith({
      providerPaymentId: "pay-1",
      webhookEventId: "evt-1",
    });
    expect(publishEvent).toHaveBeenCalledWith({
      type: "PAYMENT_SUCCESS",
      aggregateId: "order-1",
      payload: {
        payment_id: "pay-1",
        event_id: "evt-1",
        order_id: "order-1",
      },
    });
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it("should still acknowledge gateway webhook on failure", async () => {
    const json = jest.fn();
    processSuccessfulPayment.mockRejectedValue(new Error("processor failed"));

    const res = {
      json: jest.fn(),
      status: jest.fn(() => ({ json })),
    };

    await controller.gatewayWebhook(
      {
        body: {
          payment_id: "pay-1",
          event_id: "evt-1",
          order_id: "order-1",
        },
      },
      res
    );

    expect(logger.error).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ received: true });
  });
});
