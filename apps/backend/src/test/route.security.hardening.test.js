jest.useRealTimers();

const request = require("supertest");
const app = require("../app");
const Order = require("../models/order.model");
const User = require("../models/user.model");
const generateToken = require("../utils/generateToken");

describe("route security hardening", () => {
  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Order.deleteMany({})]);
  });

  it("rejects malformed payment refund payloads before controller execution", async () => {
    const admin = await User.create({
      name: "Admin Security",
      email: "admin-security@example.com",
      password: "hashed-password",
      role: "ADMIN",
    });

    const response = await request(app)
      .post("/api/payments/refund")
      .set("Authorization", `Bearer ${generateToken(admin)}`)
      .send({ orderId: "bad-id", amount: -10, reason: "" })
      .expect(400);

    expect(response.body.message).toBe("Request validation failed");
    expect(Array.isArray(response.body.errors)).toBe(true);
    expect(response.body.errors.length).toBeGreaterThan(0);
  });

  it("blocks a customer from admin user-management routes", async () => {
    const customer = await User.create({
      name: "Customer Blocked",
      email: "customer-blocked@example.com",
      password: "hashed-password",
      role: "CUSTOMER",
    });

    await request(app)
      .put("/api/admin/users/507f1f77bcf86cd799439011")
      .set("Authorization", `Bearer ${generateToken(customer)}`)
      .send({ role: "ADMIN" })
      .expect(403);
  });

  it("blocks customers from refund routes even with a valid token", async () => {
    const customer = await User.create({
      name: "Refund Customer",
      email: "refund-customer@example.com",
      password: "hashed-password",
      role: "CUSTOMER",
    });

    await request(app)
      .post("/api/payments/refund")
      .set("Authorization", `Bearer ${generateToken(customer)}`)
      .send({
        orderId: "507f1f77bcf86cd799439011",
        amount: 20,
        reason: "refund-check",
      })
      .expect(403);
  });

  it("rejects invalid product payloads before shop ownership checks", async () => {
    const owner = await User.create({
      name: "Owner Validation",
      email: "owner-validation@example.com",
      password: "hashed-password",
      role: "OWNER",
      shopId: "507f1f77bcf86cd799439012",
    });

    await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${generateToken(owner)}`)
      .send({ name: "", price: -1, stock: -3 })
      .expect(400);
  });

  it("prevents a customer from initiating payment for another customer's order", async () => {
    const shopId = "507f1f77bcf86cd799439012";
    const ownerCustomer = await User.create({
      name: "Order Owner",
      email: "order-owner@example.com",
      password: "hashed-password",
      role: "CUSTOMER",
    });
    const attackerCustomer = await User.create({
      name: "Order Attacker",
      email: "order-attacker@example.com",
      password: "hashed-password",
      role: "CUSTOMER",
    });

    const order = await Order.create({
      shopId,
      customerId: ownerCustomer._id,
      user: ownerCustomer._id,
      items: [{ name: "Rice", quantity: 1, price: 120 }],
      totalAmount: 120,
      paymentMode: "ONLINE",
      paymentStatus: "PENDING",
      status: "PAYMENT_PENDING",
    });

    await request(app)
      .post(`/api/payments/initiate/${order._id}`)
      .set("Authorization", `Bearer ${generateToken(attackerCustomer)}`)
      .set("Idempotency-Key", `security-test-${order._id}`)
      .send({ provider: "bkash" })
      .expect(403);
  });
});
