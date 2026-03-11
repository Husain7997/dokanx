jest.mock("../modules/support/models/supportTicket.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
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
