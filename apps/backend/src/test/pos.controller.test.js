const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

jest.mock("../utils/audit.util", () => ({
  createAudit: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../inventory", () => ({
  createInventoryEntry: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../services/wallet.service", () => ({
  debitCustomerWallet: jest.fn().mockResolvedValue({ success: true }),
}));

describe("pos controller", () => {
  const mongoLaunchTimeoutMs = Number(process.env.TEST_MONGO_LAUNCH_TIMEOUT_MS || 30000);
  let memoryServer;
  let controller;
  let Product;
  let User;
  let PosSession;
  let Order;
  let inventory;
  let walletService;
  const shopId = new mongoose.Types.ObjectId();
  const merchantUserId = new mongoose.Types.ObjectId();

  function createResponse() {
    return {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
  }

  beforeAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }

    memoryServer = await MongoMemoryReplSet.create({
      replSet: {
        count: 1,
        storageEngine: "wiredTiger",
        launchTimeout: mongoLaunchTimeoutMs,
      },
    });

    await mongoose.connect(memoryServer.getUri(), {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 5,
    });

    controller = require("../controllers/pos.controller");
    Product = require("../models/product.model");
    User = require("../models/user.model");
    PosSession = require("../models/posSession.model");
    Order = require("../models/order.model");
    inventory = require("../inventory");
    walletService = require("../services/wallet.service");
  });

  beforeEach(async () => {
    await Promise.all([
      Product.deleteMany({}),
      User.deleteMany({}),
      PosSession.deleteMany({}),
      Order.deleteMany({}),
    ]);

    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }

    if (memoryServer) {
      await memoryServer.stop();
      memoryServer = null;
    }
  });

  it("opens and closes a POS session", async () => {
    const openReq = {
      body: { openingBalance: 250 },
      user: { _id: merchantUserId, shopId },
      shop: { _id: shopId },
    };
    const openRes = createResponse();

    await controller.openSession(openReq, openRes);

    expect(openRes.statusCode).toBe(201);
    expect(openRes.body.data.status).toBe("OPEN");
    expect(openRes.body.data.openingBalance).toBe(250);

    const closeReq = {
      params: { sessionId: openRes.body.data._id },
      body: { closingBalance: 415 },
      user: { _id: merchantUserId, shopId },
      shop: { _id: shopId },
    };
    const closeRes = createResponse();

    await controller.closeSession(closeReq, closeRes);

    expect(closeRes.statusCode).toBe(200);
    expect(closeRes.body.data.status).toBe("CLOSED");
    expect(closeRes.body.data.closingBalance).toBe(415);
  });

  it("throws when split payment total does not match the order total", async () => {
    const product = await Product.create({
      shopId,
      name: "Rice 1kg",
      category: "Grocery",
      price: 120,
      stock: 50,
    });

    const req = {
      body: {
        items: [{ product: String(product._id), quantity: 2 }],
        paymentBreakdown: [{ mode: "CASH", amount: 100 }],
      },
      user: { _id: merchantUserId, shopId },
      shop: { _id: shopId },
    };

    await expect(controller.createPosOrder(req, createResponse())).rejects.toMatchObject({
      message: expect.stringContaining("paymentBreakdown must match the order total"),
      statusCode: 400,
    });
  });

  it("rejects wallet POS payment without a valid customer", async () => {
    const product = await Product.create({
      shopId,
      name: "Milk 1L",
      category: "Dairy",
      price: 90,
      stock: 20,
    });

    const req = {
      body: {
        items: [{ product: String(product._id), quantity: 1 }],
        paymentBreakdown: [{ mode: "WALLET", amount: 90 }],
      },
      user: { _id: merchantUserId, shopId },
      shop: { _id: shopId },
    };
    const res = createResponse();

    await controller.createPosOrder(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain("Valid customerId required");
  });

  it("creates a POS order with split wallet payment and commits inventory", async () => {
    const product = await Product.create({
      shopId,
      name: "Sugar 1kg",
      category: "Grocery",
      price: 80,
      stock: 30,
      barcode: "SUGAR-001",
    });

    const customer = await User.create({
      name: "Test Customer",
      email: "pos-customer@example.com",
      phone: "01710000000",
      password: "secret123",
      role: "CUSTOMER",
      globalCustomerId: "GCUST-POS-001",
    });

    const req = {
      body: {
        customerId: customer.globalCustomerId,
        items: [
          { product: String(product._id), quantity: 2 },
          { name: "Manual bag", quantity: 1, price: 20 },
        ],
        paymentBreakdown: [
          { mode: "WALLET", amount: 100 },
          { mode: "CASH", amount: 80 },
        ],
      },
      user: { _id: merchantUserId, shopId },
      shop: { _id: shopId },
    };
    const res = createResponse();

    await controller.createPosOrder(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.data.channel).toBe("POS");
    expect(res.body.data.totalAmount).toBe(180);
    expect(res.body.data.metadata.walletAmount).toBe(100);
    expect(res.body.data.metadata.cashAmount).toBe(80);
    expect(res.body.data.metadata.splitPayment).toBe(true);
    expect(walletService.debitCustomerWallet).toHaveBeenCalledWith(expect.objectContaining({
      userId: customer._id,
      globalCustomerId: customer.globalCustomerId,
      amount: 100,
    }));
    expect(inventory.createInventoryEntry).toHaveBeenCalledWith(expect.objectContaining({
      shopId,
      type: "ORDER_COMMIT",
      direction: "OUT",
      items: [expect.objectContaining({ product: product._id, quantity: 2 })],
    }));
  });
});
