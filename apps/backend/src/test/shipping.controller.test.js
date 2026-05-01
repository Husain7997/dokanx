const request = require("supertest");

let mongoose;

describe("shipping routes", () => {
  let app;
  let Shop;
  let Order;
  let Shipment;
  let shopId;

  beforeAll(async () => {
    jest.resetModules();

    mongoose = require("mongoose");
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URI_TEST, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        maxPoolSize: 5,
      });
    }

    shopId = new mongoose.Types.ObjectId();

    jest.doMock("../middlewares/auth.middleware", () => ({
      protect: (req, _res, next) => {
        req.user = {
          _id: new mongoose.Types.ObjectId(),
          role: "ADMIN",
          shopId,
        };
        req.shop = { _id: shopId };
        next();
      },
    }));

    app = require("../app");
    Shop = require("../models/shop.model");
    Order = require("../models/order.model");
    Shipment = require("../models/shipment.model");
  });

  beforeEach(async () => {
    await Promise.all([
      Shop.deleteMany({}),
      Order.deleteMany({}),
      Shipment.deleteMany({}),
    ]);

    await Shop.create({
      _id: shopId,
      name: "Test Shop",
      owner: new mongoose.Types.ObjectId(),
      addressLine1: "12 Test Street",
      city: "Dhaka",
      country: "Bangladesh",
    });
  });

  afterAll(async () => {
    jest.dontMock("../middlewares/auth.middleware");
  });

  it("returns shipments with nextCursor for cursor pagination", async () => {
    const order = await Order.create({
      shopId,
      totalAmount: 1200,
      items: [],
      contact: { email: "customer@example.com", phone: "01700000000" },
    });

    const baseTime = new Date("2026-03-18T08:00:00.000Z");
    await Shipment.create([
      {
        orderId: order._id,
        shopId,
        carrier: "pathao",
        trackingNumber: "trk_1",
        createdAt: new Date(baseTime.getTime() + 3000),
        updatedAt: new Date(baseTime.getTime() + 3000),
      },
      {
        orderId: order._id,
        shopId,
        carrier: "pathao",
        trackingNumber: "trk_2",
        createdAt: new Date(baseTime.getTime() + 2000),
        updatedAt: new Date(baseTime.getTime() + 2000),
      },
      {
        orderId: order._id,
        shopId,
        carrier: "pathao",
        trackingNumber: "trk_3",
        createdAt: new Date(baseTime.getTime() + 1000),
        updatedAt: new Date(baseTime.getTime() + 1000),
      },
    ]);

    const firstPage = await request(app)
      .get("/api/shipping/shipments")
      .query({ limit: 2 })
      .expect(200);

    expect(firstPage.body.data).toHaveLength(2);
    expect(firstPage.body.nextCursor).toBeTruthy();
    expect(firstPage.body.data.map((row) => row.trackingNumber)).toEqual(["trk_1", "trk_2"]);

    const secondPage = await request(app)
      .get("/api/shipping/shipments")
      .query({ limit: 2, cursor: firstPage.body.nextCursor })
      .expect(200);

    expect(secondPage.body.data).toHaveLength(1);
    expect(secondPage.body.data[0].trackingNumber).toBe("trk_3");
  });

  it("renders shipment label pdf with shipment metadata", async () => {
    const order = await Order.create({
      shopId,
      totalAmount: 2200,
      items: [],
      contact: {
        email: "buyer@example.com",
        phone: "01800000000",
        address: "34 Delivery Road, Chittagong",
      },
      metadata: {
        weight: "1.5 kg",
      },
    });

    await Shipment.create({
      orderId: order._id,
      shopId,
      carrier: "paperfly",
      trackingNumber: "paperfly_test_1",
      metadata: {
        parcelWeight: "1.5 kg",
      },
      events: [
        {
          status: "CREATED",
          message: "Shipment created",
          timestamp: new Date(),
        },
      ],
    });

    const response = await request(app)
      .get("/api/shipping/labels/paperfly_test_1/pdf")
      .expect(200);

    expect(response.headers["content-type"]).toContain("application/pdf");
    expect(response.headers["content-disposition"]).toContain("shipment-label-paperfly_test_1.pdf");
    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(500);
  });
});
