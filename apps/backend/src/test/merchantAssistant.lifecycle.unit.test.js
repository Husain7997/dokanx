jest.mock("../modules/merchant-assistant/models/contactRequest.model", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
}));

const ContactRequest = require("../modules/merchant-assistant/models/contactRequest.model");
const assistantService = require("../modules/merchant-assistant/merchantAssistant.service");

function buildRequest(status = "QUEUED") {
  return {
    _id: "contact-1",
    shopId: "shop-1",
    status,
    statusHistory: [],
    save: jest.fn().mockResolvedValue(undefined),
  };
}

describe("Merchant Assistant Contact Request Lifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should allow STAFF to move QUEUED to IN_PROGRESS", async () => {
    const request = buildRequest("QUEUED");
    ContactRequest.findOne.mockResolvedValueOnce(request);

    const result = await assistantService.updateContactRequestStatus({
      shopId: "shop-1",
      requestId: "contact-1",
      actorUserId: "user-1",
      actorRole: "STAFF",
      status: "IN_PROGRESS",
      note: "Taking ownership",
    });

    expect(result.idempotencyReplay).toBe(false);
    expect(request.status).toBe("IN_PROGRESS");
    expect(request.statusHistory).toHaveLength(1);
    expect(request.save).toHaveBeenCalled();
  });

  it("should reject STAFF resolving request directly", async () => {
    const request = buildRequest("IN_PROGRESS");
    ContactRequest.findOne.mockResolvedValueOnce(request);

    await expect(
      assistantService.updateContactRequestStatus({
        shopId: "shop-1",
        requestId: "contact-1",
        actorUserId: "user-1",
        actorRole: "STAFF",
        status: "RESOLVED",
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("should allow ADMIN to resolve IN_PROGRESS request", async () => {
    const request = buildRequest("IN_PROGRESS");
    ContactRequest.findOne.mockResolvedValueOnce(request);

    const result = await assistantService.updateContactRequestStatus({
      shopId: "shop-1",
      requestId: "contact-1",
      actorUserId: "admin-1",
      actorRole: "ADMIN",
      status: "RESOLVED",
      note: "Resolved via call",
    });

    expect(result.idempotencyReplay).toBe(false);
    expect(request.status).toBe("RESOLVED");
    expect(request.statusHistory).toHaveLength(1);
  });
});
