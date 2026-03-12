const mongoose = require("mongoose");
const automationService = require("../modules/automation/automation.service");
const AutomationTask = require("../modules/automation/models/automationTask.model");
const LoyaltyPointLedger = require("../modules/automation/models/loyaltyPointLedger.model");

describe("automation dashboard db integration", () => {
  const shopId = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    if (!global.__TEST_DB_AVAILABLE) return;
    await AutomationTask.deleteMany({ shopId });
    await LoyaltyPointLedger.deleteMany({ shopId });
  });

  afterAll(async () => {
    if (!global.__TEST_DB_AVAILABLE) return;
    await AutomationTask.deleteMany({ shopId });
    await LoyaltyPointLedger.deleteMany({ shopId });
  });

  it("should aggregate persisted task and loyalty data", async () => {
    if (!global.__TEST_DB_AVAILABLE) return;
    await AutomationTask.create({
      shopId,
      title: "Call customer",
      status: "OPEN",
    });
    await LoyaltyPointLedger.create({
      shopId,
      customerPhone: "01700000000",
      points: 25,
      reason: "Reward",
    });

    const result = await automationService.getDashboard({ shopId, limit: 5 });

    expect(result.recentTasks.length).toBe(1);
    expect(result.loyalty.totalPoints).toBe(25);
  });
});
