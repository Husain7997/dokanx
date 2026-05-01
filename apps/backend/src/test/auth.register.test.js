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
    expect(savedUser.normalizedPhone).toBe("8801712345678");
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

  it("issues a refresh cookie, refreshes the session, and logs out cleanly", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({
        name: "Customer Four",
        email: "customer4@example.com",
        phone: "+8801712345679",
        password: "Passw0rd!",
      })
      .expect(201);

    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: "customer4@example.com",
        password: "Passw0rd!",
      })
      .expect(200);

    expect(loginResponse.body.accessToken).toBeTruthy();
    expect(loginResponse.headers["set-cookie"]?.join(";")).toContain("dx_refresh_token=");

    const refreshResponse = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", loginResponse.headers["set-cookie"])
      .expect(200);

    expect(refreshResponse.body.accessToken).toBeTruthy();

    const logoutResponse = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", loginResponse.headers["set-cookie"])
      .expect(200);

    expect(logoutResponse.body.success).toBe(true);

    await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", loginResponse.headers["set-cookie"])
      .expect(401);
  });

  it("applies security headers on API responses", async () => {
    const response = await request(app)
      .get("/api/health")
      .expect(200);

    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["content-security-policy"]).toContain("default-src 'self'");
  });
});
