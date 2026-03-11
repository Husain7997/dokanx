jest.mock("../modules/support/models/supportTicket.model", () => ({
  aggregate: jest.fn(),
  countDocuments: jest.fn(),
}));

const SupportTicket = require("../modules/support/models/supportTicket.model");
const service = require("../modules/support/support.service");

describe("support analytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should compute support analytics", async () => {
    SupportTicket.aggregate
      .mockResolvedValueOnce([{ _id: "OPEN", count: 3 }])
      .mockResolvedValueOnce([{ _id: "HIGH", count: 2 }])
      .mockResolvedValueOnce([{ avgRating: 4.5, ratedCount: 2 }])
      .mockResolvedValueOnce([{ _id: "FINANCE", count: 4 }]);
    SupportTicket.countDocuments.mockResolvedValue(1);

    const row = await service.getSupportAnalytics({ shopId: "shop-1" });
    expect(row.overdueOpenTickets).toBe(1);
    expect(row.averageRating).toBe(4.5);
  });

  it("should return agent leaderboard", async () => {
    SupportTicket.aggregate.mockResolvedValue([
      { _id: "agent-1", totalTickets: 5, resolvedTickets: 4, avgRating: 4.8 },
    ]);

    const rows = await service.getAgentLeaderboard({ shopId: "shop-1" });
    expect(rows[0].resolvedTickets).toBe(4);
  });
});
