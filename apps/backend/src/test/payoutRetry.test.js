jest.mock("../models/payout.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../models/PayoutRetry", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

const Payout = require("../models/payout.model");
const PayoutRetry = require("../models/PayoutRetry");
const { retryPayout } = require("../services/payoutRetry.service");

describe("payoutRetry.service retryPayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a retry record and marks both documents successful", async () => {
    const payout = {
      _id: "payout-1",
      status: "FAILED",
      save: jest.fn().mockResolvedValue(true),
    };
    const retry = {
      payoutId: "payout-1",
      attempts: 0,
      status: "PENDING",
      save: jest.fn().mockResolvedValue(true),
    };

    Payout.findById.mockResolvedValue(payout);
    PayoutRetry.findOne.mockResolvedValue(null);
    PayoutRetry.create.mockResolvedValue(retry);

    await retryPayout("payout-1");

    expect(PayoutRetry.create).toHaveBeenCalledWith({ payoutId: "payout-1" });
    expect(payout.status).toBe("SUCCESS");
    expect(retry.status).toBe("SUCCESS");
    expect(payout.save).toHaveBeenCalled();
    expect(retry.save).toHaveBeenCalled();
  });

  it("stops when the retry cap has been reached", async () => {
    const payout = {
      _id: "payout-2",
      status: "FAILED",
      save: jest.fn(),
    };
    const retry = {
      payoutId: "payout-2",
      attempts: 5,
      status: "PENDING",
      save: jest.fn().mockResolvedValue(true),
    };

    Payout.findById.mockResolvedValue(payout);
    PayoutRetry.findOne.mockResolvedValue(retry);

    await retryPayout("payout-2");

    expect(retry.status).toBe("FAILED");
    expect(retry.save).toHaveBeenCalled();
    expect(payout.save).not.toHaveBeenCalled();
  });
});
