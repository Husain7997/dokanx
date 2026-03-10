jest.mock("../modules/merchant-assistant/models/contactRequest.model", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
}));

const ContactRequest = require("../modules/merchant-assistant/models/contactRequest.model");
const assistantService = require("../modules/merchant-assistant/merchantAssistant.service");

describe("Merchant Assistant Contact Request Write", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return idempotency replay when same key exists", async () => {
    ContactRequest.findOne.mockResolvedValueOnce({
      _id: "req-1",
      shopId: "shop-1",
      idempotencyKey: "idem-1",
    });

    const result = await assistantService.createContactRequest({
      shopId: "shop-1",
      requestedBy: "user-1",
      message: "Need callback",
      idempotencyKey: "idem-1",
    });

    expect(result.idempotencyReplay).toBe(true);
    expect(result.contactRequest._id).toBe("req-1");
    expect(ContactRequest.create).not.toHaveBeenCalled();
  });

  it("should create new contact request when key is new", async () => {
    ContactRequest.findOne.mockResolvedValueOnce(null);
    ContactRequest.create.mockResolvedValueOnce({
      _id: "req-2",
      shopId: "shop-1",
      status: "QUEUED",
    });

    const result = await assistantService.createContactRequest({
      shopId: "shop-1",
      requestedBy: "user-1",
      message: "Need callback",
      targetRole: "ADMIN",
      channel: "VOICE",
      priority: "HIGH",
      idempotencyKey: "idem-2",
    });

    expect(result.idempotencyReplay).toBe(false);
    expect(result.contactRequest._id).toBe("req-2");
    expect(ContactRequest.create).toHaveBeenCalledTimes(1);
  });
});
