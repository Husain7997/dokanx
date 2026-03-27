jest.useRealTimers();

const request = require("supertest");
const app = require("../app");
const User = require("../models/user.model");

beforeEach(async () => {
  await User.deleteMany({});
});

describe("POST /api/auth/register", () => {
  it("creates a customer account with validated email, phone, and password", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Customer One",
        email: "customer1@example.com",
        phone: "+8801712345678",
        password: "Passw0rd!",
      })
      .expect(201);

    expect(response.body.token).toBeTruthy();
    expect(response.body.user).toMatchObject({
      name: "Customer One",
      email: "customer1@example.com",
      phone: "+8801712345678",
      role: "CUSTOMER",
    });

    const savedUser = await User.findOne({ email: "customer1@example.com" }).select("+password");
    expect(savedUser).toBeTruthy();
    expect(savedUser.phone).toBe("+8801712345678");
    expect(savedUser.password).not.toBe("Passw0rd!");
  });

  it("rejects missing contact information", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Customer Two",
        password: "Passw0rd!",
      })
      .expect(400);

    expect(response.body.message).toBe("Email or phone is required");
  });

  it("rejects weak passwords", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Customer Three",
        email: "customer3@example.com",
        password: "password",
      })
      .expect(400);

    expect(response.body.message).toBe("Password must include letters and numbers");
  });
});
