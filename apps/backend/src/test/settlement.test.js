const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.test" });

const { connectDB, disconnectDB, clearDB } = require("./setup");

const Shop = require("../models/shop.model");
const ShopWallet = require("../models/ShopWallet");
const Order = require("../models/order.model");
const { processShopSettlement } = require("../services/settlement.service");

describe("Settlement Engine", () => {
  let shop;

  beforeAll(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    await clearDB();

    shop = await Shop.create({
      name: "Test Shop",
      owner: new mongoose.Types.ObjectId(),
      slug: "test-shop-" + Date.now(),
    });

    await ShopWallet.create({ shop: shop._id, balance: 0 });

    await Order.create([
      { shop: shop._id, totalAmount: 100, paymentStatus: "SUCCESS" },
      { shop: shop._id, totalAmount: 200, paymentStatus: "SUCCESS" },
      { shop: shop._id, totalAmount: 300, paymentStatus: "SUCCESS" },
    ]);
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it("should create a settlement correctly", async () => {
    const settlement = await processShopSettlement(shop._id, "single-001");

    expect(settlement.orderCount).toBe(3);
    expect(settlement.status).toBe("PAID"); // ✅ UPDATED
    expect(settlement.shopId.toString()).toBe(shop._id.toString());
  });
});
