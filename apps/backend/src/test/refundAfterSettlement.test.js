const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.test" });

const { connectDB, disconnectDB, clearDB } = require("./setup");

const Shop = require("../models/shop.model");
const ShopWallet = require("../models/ShopWallet");
const { processRefundAfterSettlement } = require("../services/refundAfterSettlement.service");

describe("Refund After Settlement", () => {
  let shop;

  beforeAll(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    await clearDB();

    shop = await Shop.create({
      name: "Refund Shop",
      owner: new mongoose.Types.ObjectId(),
      slug: "refund-" + Date.now(),
    });

    await ShopWallet.create({
      shop: shop._id,
      balance: 0,
    });
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it("should credit wallet after refund", async () => {
    await processRefundAfterSettlement(shop._id, 500);

    const wallet = await ShopWallet.findOne({ shop: shop._id });
    expect(wallet).not.toBeNull();
    expect(wallet.balance).toBe(500);
  });
});
