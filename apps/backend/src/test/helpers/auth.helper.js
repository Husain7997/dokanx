const request = require("supertest");
const app = require("../../app");

function randomId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function randomPhone() {
  return `017${Math.floor(10000000 + Math.random() * 90000000)}`;
}

async function loginUser(email) {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "Passw0rd!" })
    .expect(200);

  return response.body.token;
}

async function createAdminAndLogin() {
  const email = `admin-${randomId()}@test.com`;
  const response = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Test Admin",
      email,
      password: "Passw0rd!",
      role: "ADMIN",
      phone: randomPhone(),
    })
    .expect(201);

  const token = await loginUser(email);
  return {
    token,
    user: response.body.user,
    email,
  };
}

async function createShopOwnerAndLogin() {
  const email = `owner-${randomId()}@test.com`;
  const registerResponse = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Test Owner",
      email,
      password: "Passw0rd!",
      role: "OWNER",
      phone: randomPhone(),
    })
    .expect(201);

  const token = await loginUser(email);
  const shopResponse = await request(app)
    .post("/api/shops")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: `Owner Shop ${randomId()}`,
      currency: "BDT",
      timezone: "Asia/Dhaka",
      locale: "en",
    })
    .expect(201);

  return {
    token,
    user: registerResponse.body.user,
    shop: shopResponse.body.shop,
    shopId: shopResponse.body.shop._id,
  };
}

async function requestSensitiveOtpChallenge(token, action, targetId, targetType = "payout") {
  const response = await request(app)
    .post("/api/auth/otp/challenge")
    .set("Authorization", `Bearer ${token}`)
    .send({ action, targetId, targetType })
    .expect(201);

  return response.body.data;
}

module.exports = {
  createAdminAndLogin,
  createShopOwnerAndLogin,
  requestSensitiveOtpChallenge,
};
