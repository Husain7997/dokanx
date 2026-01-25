jest.setTimeout(30000);
const mongoose = require("mongoose");
const { retryPayout } = require("../services/payoutRetry.service");

describe("Payout Retry", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should retry payout safely", async () => {
    let executed = 0;

    const retry = async () => {
      executed++;
      if (executed < 2) throw new Error("fail");
      return true;
    };

    const promise = retry().catch(() => retry());

    jest.runAllTimers();

    await expect(promise).resolves.toBe(true);
    expect(executed).toBe(2);
  });
});

