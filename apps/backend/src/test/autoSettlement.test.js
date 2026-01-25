jest.setTimeout(30000);

const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.test" });

const { connectDB, disconnectDB, clearDB } = require("./setup");

const Shop = require("../models/shop.model");
const { runAutoSettlement } = require("../services/autoSettlement.service");

describe("Auto Settlement Idempotency", () => {
  let shop;

  beforeAll(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    await clearDB();

    shop = await Shop.create({
      name: "Auto Shop",
      owner: new mongoose.Types.ObjectId(),
      slug: "auto-" + Date.now(),
    });
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it("should be idempotent for same auto-settlement key", async () => {
    const key = "auto-001";

    const first = await runAutoSettlement(shop._id, key);
    const second = await runAutoSettlement(shop._id, key);

    expect(first._id.toString()).toBe(second._id.toString());
  });
});
