jest.mock("axios", () => jest.fn());

jest.mock("../modules/app-marketplace/models/appWebhook.model", () => ({
  findOneAndUpdate: jest.fn(),
  find: jest.fn(),
}));

jest.mock("../modules/app-marketplace/models/appWebhookDelivery.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
}));

const AppWebhook = require("../modules/app-marketplace/models/appWebhook.model");
const AppWebhookDelivery = require("../modules/app-marketplace/models/appWebhookDelivery.model");
const axios = require("axios");
const service = require("../modules/app-marketplace/webhookDelivery.service");

describe("app webhook delivery service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should register webhook and return generated secret", async () => {
    AppWebhook.findOneAndUpdate.mockResolvedValue({ _id: "webhook-1" });

    const result = await service.registerWebhook({
      appId: "app-1",
      shopId: "shop-1",
      actorId: "user-1",
      payload: {
        eventName: "ORDER_CREATED",
        targetUrl: "https://example.com/hook",
      },
    });

    expect(result.webhook._id).toBe("webhook-1");
    expect(result.secret).toBeTruthy();
  });

  it("should queue delivery rows for active hooks", async () => {
    process.env.APP_WEBHOOK_EXECUTE_REQUESTS = "false";
    AppWebhook.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([
        {
          _id: "webhook-1",
          appId: "app-1",
          shopId: "shop-1",
          targetUrl: "https://example.com/hook",
          secretHash: "secret",
        },
      ]),
    });
    AppWebhookDelivery.create.mockImplementation(async payload => ({
      ...payload,
      save: jest.fn().mockResolvedValue(true),
    }));

    const rows = await service.deliverEvent({
      eventName: "ORDER_CREATED",
      payload: { shopId: "shop-1", orderId: "order-1" },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("QUEUED");
  });

  it("should mark delivery delivered when live webhook succeeds", async () => {
    process.env.APP_WEBHOOK_EXECUTE_REQUESTS = "true";
    axios.mockResolvedValue({ status: 200, data: { ok: true } });
    const delivery = {
      targetUrl: "https://example.com/hook",
      requestBody: { eventName: "ORDER_CREATED" },
      responseBody: { signature: "sig" },
      attemptCount: 0,
      save: jest.fn().mockResolvedValue(true),
    };

    const row = await service.dispatchWebhook(delivery);

    expect(row.status).toBe("DELIVERED");
    expect(row.responseStatus).toBe(200);
  });

  it("should dead-letter after max retry attempts", async () => {
    process.env.APP_WEBHOOK_EXECUTE_REQUESTS = "true";
    process.env.APP_WEBHOOK_MAX_ATTEMPTS = "1";
    axios.mockRejectedValue(new Error("timeout"));
    const delivery = {
      targetUrl: "https://example.com/hook",
      requestBody: { eventName: "ORDER_CREATED" },
      responseBody: { signature: "sig" },
      attemptCount: 0,
      save: jest.fn().mockResolvedValue(true),
    };

    const row = await service.dispatchWebhook(delivery);

    expect(row.status).toBe("FAILED");
    expect(row.deadLetteredAt).toBeTruthy();
  });

  it("should process retry batch", async () => {
    process.env.APP_WEBHOOK_EXECUTE_REQUESTS = "false";
    AppWebhookDelivery.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([
          {
            status: "FAILED",
            attemptCount: 1,
            responseBody: { signature: "sig" },
            targetUrl: "https://example.com/hook",
            requestBody: {},
            save: jest.fn().mockResolvedValue(true),
          },
        ]),
      }),
    });

    const result = await service.processRetryBatch({ limit: 10 });

    expect(result.retried).toBe(1);
  });
});
