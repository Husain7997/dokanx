describe.skip("Settlement & Payout", () => {
  // legacy test – disabled in STEP–3
});
const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.test" });

const { processShopSettlement } = require("../services/settlement.service");
const Order = require("../models/order.model");
const Settlement = require("../models/settlement.model");
const ShopWallet = require("../models/ShopWallet");
const Ledger = require("../models/ledger.model");

jest.setTimeout(40000); // Atlas latency safe

describe("Settlement Engine", () => {
  let shopId;

  beforeAll(async () => {
    // 1️⃣ Connect to test DB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("TEST MONGO_URI =", process.env.MONGO_URI);

    shopId = new mongoose.Types.ObjectId();

    // 2️⃣ Insert test orders
    await Order.create([
      { shop: shopId, totalAmount: 1000, paymentStatus: "SUCCESS" },
      { shop: shopId, totalAmount: 500, paymentStatus: "SUCCESS" },
      { shop: shopId, totalAmount: 200, paymentStatus: "SUCCESS" },
    ]);

    // 3️⃣ Create initial wallet
    await ShopWallet.create({ shop: shopId, balance: 0 });
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  it("should create a settlement correctly", async () => {
    const key = "settle-test-001";

    const settlement = await processShopSettlement(shopId, key);

    expect(settlement.shop.toString()).toBe(shopId.toString());
    expect(settlement.grossAmount).toBe(1700); // 1000+500+200
    expect(settlement.platformFee).toBe(Math.round(1700 * 0.05));
    expect(settlement.netAmount).toBe(1700 - Math.round(1700 * 0.05));
    expect(settlement.orderCount).toBe(3);
    expect(settlement.status).toBe("COMPLETED");

    const wallet = await ShopWallet.findOne({ shop: shopId });
    expect(wallet.balance).toBe(settlement.netAmount);

    // Orders marked as settled
    const orders = await Order.find({ shop: shopId });
    orders.forEach(o => expect(o.isSettled).toBe(true));

    // Ledger entries created
    const ledger = await Ledger.findOne({ referenceId: settlement._id });
    expect(ledger).not.toBeNull();
    expect(ledger.amount).toBe(settlement.netAmount);
    expect(ledger.type).toBe("CREDIT");
    expect(ledger.balanceAfter).toBe(wallet.balance);
  });

  it("should prevent double settlement with same idempotency key", async () => {
    const key = "settle-test-001";

    const first = await processShopSettlement(shopId, key);
    const second = await processShopSettlement(shopId, key);

    expect(first._id.toString()).toBe(second._id.toString());

    const count = await Settlement.countDocuments({ shop: shopId });
    expect(count).toBe(1);
  });
});
