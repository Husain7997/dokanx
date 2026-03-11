jest.mock("../modules/support/models/supportTicket.model", () => ({
  find: jest.fn(),
}));

jest.mock("../core/infrastructure", () => ({
  notificationDispatcher: {
    dispatch: jest.fn(),
  },
  logger: {
    warn: jest.fn(),
  },
}));

const SupportTicket = require("../modules/support/models/supportTicket.model");
const { notificationDispatcher } = require("../core/infrastructure");
const service = require("../modules/support/support.service");

describe("support SLA", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should list SLA breaches", async () => {
    SupportTicket.find.mockReturnValue({
      sort: () => ({
        limit: () => ({
          lean: async () => [{ _id: "ticket-1" }],
        }),
      }),
    });

    const rows = await service.listSlaBreaches({ shopId: "shop-1", limit: 10 });
    expect(rows).toHaveLength(1);
  });

  it("should escalate overdue tickets and notify recipient", async () => {
    const save = jest.fn().mockResolvedValue(true);
    SupportTicket.find.mockReturnValue({
      limit: async () => [
        {
          _id: "ticket-1",
          subject: "Payment issue",
          assignedTo: "user-1",
          createdBy: "user-2",
          escalationLevel: 0,
          comments: [],
          save,
        },
      ],
    });

    const rows = await service.runSlaEscalation({ shopId: "shop-1" });
    expect(rows).toHaveLength(1);
    expect(save).toHaveBeenCalled();
    expect(notificationDispatcher.dispatch).toHaveBeenCalled();
  });
});
