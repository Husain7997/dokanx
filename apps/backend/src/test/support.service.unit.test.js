jest.mock("../modules/support/models/supportTicket.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  aggregate: jest.fn(),
}));

jest.mock("../modules/support/models/quickReply.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
}));

const SupportTicket = require("../modules/support/models/supportTicket.model");
const SupportQuickReply = require("../modules/support/models/quickReply.model");
const service = require("../modules/support/support.service");

describe("support.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should auto-assign team and sla on create", async () => {
    SupportTicket.aggregate.mockResolvedValue([]);
    SupportTicket.create.mockImplementation(async payload => payload);

    const ticket = await service.createTicket({
      shopId: "shop-1",
      createdBy: "user-1",
      createdByRole: "OWNER",
      subject: "Payment issue",
      description: "Need help",
      category: "PAYMENT",
      priority: "URGENT",
    });

    expect(ticket.assignedTeam).toBe("FINANCE");
    expect(ticket.status).toBe("OPEN");
    expect(ticket.slaDueAt).toBeInstanceOf(Date);
  });

  it("should assign least loaded agent when available", async () => {
    SupportTicket.aggregate.mockResolvedValue([{ _id: "agent-1", openCount: 1 }]);
    SupportTicket.create.mockImplementation(async payload => payload);

    const ticket = await service.createTicket({
      shopId: "shop-1",
      createdBy: "user-1",
      createdByRole: "OWNER",
      subject: "Delivery issue",
      description: "Need help",
      category: "DELIVERY",
      priority: "MEDIUM",
    });

    expect(ticket.assignedTo).toBe("agent-1");
    expect(ticket.status).toBe("ASSIGNED");
  });

  it("should list quick replies by category", async () => {
    SupportQuickReply.find.mockReturnValue({
      sort: () => ({
        lean: async () => [{ title: "Reply 1" }],
      }),
    });

    const rows = await service.listQuickReplies({
      shopId: "shop-1",
      category: "GENERAL",
    });

    expect(rows).toHaveLength(1);
  });
});
