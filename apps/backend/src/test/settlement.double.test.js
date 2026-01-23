const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.test" });

const { processShopSettlement } = require("../services/settlement.service");
const Order = require("../models/order.model");
const Settlement = require("../models/settlement.model");
const ShopWallet = require("../models/ShopWallet");

jest.setTimeout(30000); // 30s timeout for DB ops

describe("Settlement Idempotency", () => {
  let shopId;
  let wallet;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("TEST MONGO_URI =", process.env.MONGO_URI);

    shopId = new mongoose.Types.ObjectId();

    // 1️⃣ Create initial orders
    await Order.create([
      { shop: shopId, totalAmount: 500, paymentStatus: "SUCCESS" },
      { shop: shopId, totalAmount: 600, paymentStatus: "SUCCESS" },
      { shop: shopId, totalAmount: 600, paymentStatus: "SUCCESS" },
    ]);

    // 2️⃣ Create initial wallet
    wallet = await ShopWallet.findOne({ shop: shopId });
    if (!wallet) {
      wallet = await ShopWallet.create({ shop: shopId, balance: 0 });
    }
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  it("should prevent double settlement with same idempotency key", async () => {
    const key = "settle-test-001";

    // First settlement
    const first = await processShopSettlement(shopId, key);

    // Second settlement (should not create new)
    const second = await processShopSettlement(shopId, key);

    // 1️⃣ Idempotency check
    const count = await Settlement.countDocuments({ shop: shopId });
    expect(first._id.toString()).toBe(second._id.toString());
    expect(count).toBe(1);

    // 2️⃣ Wallet balance check
    const updatedWallet = await ShopWallet.findOne({ shop: shopId });
    const expectedNet = 500 + 600 + 600 - Math.round((500 + 600 + 600) * 0.05);
    expect(updatedWallet.balance).toBe(expectedNet);

    // 3️⃣ Orders should be marked settled
    const orders = await Order.find({ shop: shopId });
    orders.forEach(o => expect(o.isSettled).toBe(true));
  });
});
