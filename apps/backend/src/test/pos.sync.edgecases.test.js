jest.mock("../modules/pos/models/posSyncQueue.model", () => ({
  find: jest.fn(),
}));

const PosSyncQueue = require("../modules/pos/models/posSyncQueue.model");
const posService = require("../modules/pos/pos.service");
const analytics = require("../modules/pos/pos.analytics.service");

describe("pos sync edge cases", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("marks failed queue rows when processor throws", async () => {
    const save = jest.fn();
    PosSyncQueue.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        {
          shopId: "shop-1",
          terminalId: "terminal-1",
          clientMutationId: "mut-1",
          status: "PENDING",
          attemptCount: 0,
          lastError: "",
          save,
        },
      ]),
    });

    const result = await posService.syncOfflineQueue({
      shopId: "shop-1",
      processor: async () => {
        throw new Error("conflict");
      },
    });

    expect(result).toEqual({ synced: 0, failed: 1, total: 1 });
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("detects queue integrity issues", () => {
    const report = analytics.verifyOfflineQueueIntegrity([
      {
        shopId: "shop-1",
        terminalId: "terminal-1",
        clientMutationId: "mut-1",
        status: "FAILED",
        attemptCount: 2,
        lastError: "",
      },
      {
        shopId: "shop-1",
        terminalId: "terminal-1",
        clientMutationId: "mut-1",
        status: "PROCESSING",
        attemptCount: 3,
        lastError: "retrying",
      },
    ]);

    expect(report.ok).toBe(false);
    expect(report.issueCount).toBe(3);
  });

  it("prefers the newer payload during sync conflict resolution", () => {
    const resolution = analytics.resolveSyncConflict({
      localPayload: { updatedAt: "2026-03-12T08:00:00.000Z" },
      remoteOrder: { updatedAt: "2026-03-12T07:00:00.000Z" },
    });

    expect(resolution.resolution).toBe("APPLY_LOCAL");
  });
});
