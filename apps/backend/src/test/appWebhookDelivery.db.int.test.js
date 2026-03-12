const mongoose = require("mongoose");
const axios = require("axios");

jest.mock("axios");

const AppWebhook = require("../modules/app-marketplace/models/appWebhook.model");
const AppWebhookDelivery = require("../modules/app-marketplace/models/appWebhookDelivery.model");
const service = require("../modules/app-marketplace/webhookDelivery.service");

describe("app webhook delivery db integration", () => {
  const shopId = new mongoose.Types.ObjectId();
  const appId = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    if (!global.__TEST_DB_AVAILABLE) return;
    await AppWebhook.deleteMany({ shopId });
    await AppWebhookDelivery.deleteMany({ shopId });
  });

  afterAll(async () => {
    if (!global.__TEST_DB_AVAILABLE) return;
    await AppWebhook.deleteMany({ shopId });
    await AppWebhookDelivery.deleteMany({ shopId });
  });

  it("should persist dead-letter state after failed live dispatch", async () => {
    if (!global.__TEST_DB_AVAILABLE) return;
    process.env.APP_WEBHOOK_EXECUTE_REQUESTS = "true";
    process.env.APP_WEBHOOK_MAX_ATTEMPTS = "1";
    axios.mockRejectedValue(new Error("network error"));

    const { webhook } = await service.registerWebhook({
      appId,
      shopId,
      actorId: null,
      payload: {
        eventName: "ORDER_CREATED",
        targetUrl: "https://example.com/webhook",
        secret: "secret-1",
      },
    });

    const rows = await service.deliverEvent({
      eventName: "ORDER_CREATED",
      payload: { shopId, orderId: new mongoose.Types.ObjectId() },
    });

    expect(String(rows[0].webhookId)).toBe(String(webhook._id));

    const saved = await AppWebhookDelivery.findById(rows[0]._id).lean();
    expect(saved.status).toBe("FAILED");
    expect(saved.deadLetteredAt).toBeTruthy();
  });
});
