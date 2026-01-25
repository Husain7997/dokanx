const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.test" });

const { connectDB, disconnectDB, clearDB } = require("./setup");

const Shop = require("../models/shop.model");
const ShopWallet = require("../models/ShopWallet");
const Order = require("../models/order.model");
const { processShopSettlement } = require("../services/settlement.service");

describe("Multi-tenant settlement & payout", () => {
  let shopA, shopB;

  beforeAll(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    await clearDB();

    shopA = await Shop.create({
      name: "Shop A",
      owner: new mongoose.Types.ObjectId(),
      slug: "shop-a-" + Date.now(),
    });

    shopB = await Shop.create({
      name: "Shop B",
      owner: new mongoose.Types.ObjectId(),
      slug: "shop-b-" + Date.now(),
    });

    await ShopWallet.create({ shop: shopA._id, balance: 0 });
    await ShopWallet.create({ shop: shopB._id, balance: 0 });

    await Order.create([
      { shop: shopA._id, totalAmount: 100, paymentStatus: "SUCCESS" },
      { shop: shopB._id, totalAmount: 200, paymentStatus: "SUCCESS" },
    ]);
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it("should settle multiple shops independently", async () => {
    const settlementA = await processShopSettlement(shopA._id, "multi-001");
    const settlementB = await processShopSettlement(shopB._id, "multi-002");

    expect(settlementA.shopId.toString()).toBe(shopA._id.toString()); // ✅ FIX
    expect(settlementB.shopId.toString()).toBe(shopB._id.toString());
  });
});
