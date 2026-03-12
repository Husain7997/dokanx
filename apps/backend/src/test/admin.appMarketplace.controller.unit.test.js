jest.mock("../modules/app-marketplace/webhookDelivery.service", () => ({
  listDeadLetters: jest.fn(),
}));

const webhookDeliveryService = require("../modules/app-marketplace/webhookDelivery.service");
const controller = require("../controllers/admin/appMarketplace.controller");

describe("admin app marketplace controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return dead-letter deliveries", async () => {
    webhookDeliveryService.listDeadLetters.mockResolvedValue([{ _id: "dead-1" }]);
    const req = { query: { limit: "10" }, lang: "en" };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await controller.getWebhookDeadLetters(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
