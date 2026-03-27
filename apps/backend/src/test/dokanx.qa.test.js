jest.useRealTimers();

const request = require("supertest");

const app = require("../app");
const User = require("../models/user.model");
const Shop = require("../models/shop.model");
const Product = require("../models/product.model");
const ShopLocation = require("../models/shopLocation.model");
const Order = require("../models/order.model");
const PaymentAttempt = require("../models/paymentAttempt.model");
const Wallet = require("../models/wallet.model");
const Inventory = require("../models/Inventory.model");
const AccountingEntry = require("../modules/wallet-engine/accountingEntry.model");
const CreditAccount = require("../modules/credit/credit.account.model");
const CreditSale = require("../modules/credit-engine/creditSale.model");
const CreditLedger = require("../modules/credit/credit.ledger.model");
const CustomerIdentity = require("../modules/customer/customer.identity.model");
const {
  getShopReconciliationReport,
  assertShopFinancialInvariant,
} = require("../services/ledger-reconciliation.service");

const PASSWORD = "Passw0rd!";

async function clearData() {
  await Promise.all([
    AccountingEntry.deleteMany({}),
    CreditLedger.deleteMany({}),
    CreditSale.deleteMany({}),
    CreditAccount.deleteMany({}),
    PaymentAttempt.deleteMany({}),
    Order.deleteMany({}),
    Inventory.deleteMany({}),
    Product.deleteMany({}),
    ShopLocation.deleteMany({}),
    Wallet.deleteMany({}),
    Shop.deleteMany({}),
    CustomerIdentity.deleteMany({}),
    User.deleteMany({}),
  ]);
}

function uniqueEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`;
}

async function registerUser({ name, email, role = "CUSTOMER", phone }) {
  const response = await request(app)
    .post("/api/auth/register")
    .send({
      name,
      email,
      phone,
      password: PASSWORD,
      role,
    })
    .expect(201);

  return response.body;
}

async function loginUser(email, requestId = `login-${Date.now()}`) {
  const response = await request(app)
    .post("/api/auth/login")
    .set("x-request-id", requestId)
    .send({ email, password: PASSWORD })
    .expect(200);

  return response.body.token;
}

async function registerAndLogin({ name, role = "CUSTOMER", phone }) {
  const email = uniqueEmail(String(role || "user").toLowerCase());
  const register = await registerUser({ name, email, role, phone });
  const token = await loginUser(email);
  return {
    email,
    token,
    user: register.user,
  };
}

async function createShopAsOwner(token, name = `Shop ${Date.now()}`) {
  const response = await request(app)
    .post("/api/shops")
    .set("Authorization", `Bearer ${token}`)
    .set("x-request-id", `shop-${Date.now()}`)
    .send({
      name,
      currency: "BDT",
      timezone: "Asia/Dhaka",
      locale: "en",
    })
    .expect(201);

  return response.body.shop;
}

async function createProductAsOwner(token, body) {
  const response = await request(app)
    .post("/api/products")
    .set("Authorization", `Bearer ${token}`)
    .set("x-request-id", `product-${Date.now()}`)
    .send(body)
    .expect(201);

  return response.body.product;
}

async function bootstrapShopActors({ withSecondCustomer = false } = {}) {
  const owner = await registerAndLogin({ name: "Owner", role: "OWNER" });
  const customerA = await registerAndLogin({ name: "Customer A", role: "CUSTOMER" });
  const customerB = withSecondCustomer
    ? await registerAndLogin({ name: "Customer B", role: "CUSTOMER" })
    : null;

  const shop = await createShopAsOwner(owner.token);
  const product = await createProductAsOwner(owner.token, {
    name: `QA Product ${Date.now()}`,
    price: 100,
    stock: 25,
    slug: `qa-product-${Date.now()}`,
    warranty: {
      enabled: true,
      durationDays: 30,
      type: "service",
    },
  });

  await ShopLocation.create({
    shopId: shop._id,
    name: "Main Branch",
    address: "1 QA Street",
    city: "Dhaka",
    country: "Bangladesh",
    coordinates: {
      type: "Point",
      coordinates: [90.4125, 23.8103],
    },
    isActive: true,
  });

  const [freshOwner, freshCustomerA, freshCustomerB] = await Promise.all([
    User.findById(owner.user._id),
    User.findById(customerA.user._id),
    customerB?.user?._id ? User.findById(customerB.user._id) : null,
  ]);

  return {
    owner: { ...owner, user: freshOwner },
    customerA: { ...customerA, user: freshCustomerA },
    customerB: customerB ? { ...customerB, user: freshCustomerB } : null,
    shop,
    product,
  };
}

async function seedCustomerCash(userId, cash) {
  await User.findByIdAndUpdate(userId, {
    $set: {
      customerWallet: {
        cash,
        credit: 0,
        bank: 0,
        updatedAt: new Date(),
      },
    },
  });
}

async function setCreditLimit({ ownerToken, customerGlobalId, shopId, creditLimit }) {
  await request(app)
    .post("/api/credit/limits")
    .set("Authorization", `Bearer ${ownerToken}`)
    .set("x-request-id", `credit-limit-${Date.now()}`)
    .send({
      customerId: customerGlobalId,
      shopId,
      creditLimit,
    })
    .expect(200);
}

async function placeOrder({ token, shopId, productId, paymentMode, totalAmount = 100, requestId = `order-${Date.now()}` }) {
  const response = await request(app)
    .post("/api/orders")
    .set("Authorization", `Bearer ${token}`)
    .set("x-request-id", requestId)
    .set("idempotency-key", `idem-${requestId}`)
    .send({
      shopId,
      items: [{ product: productId, quantity: 1, price: totalAmount }],
      totalAmount,
      paymentMode,
      deliveryAddress: {
        line1: "House 1",
        city: "Dhaka",
        country: "Bangladesh",
      },
    });

  expect(response.status).toBe(201);
  return response.body.data;
}

async function initiatePayment({ token, orderId, provider = "bkash" }) {
  const response = await request(app)
    .post(`/api/payments/initiate/${orderId}`)
    .set("Authorization", `Bearer ${token}`)
    .set("x-request-id", `payment-init-${Date.now()}`)
    .set("idempotency-key", `idem-payment-init-${orderId}-${Date.now()}`)
    .send({ provider })
    .expect(201);

  return response.body;
}

function sendPaymentWebhook({ providerPaymentId, status, eventId, referenceId }) {
  return request(app)
    .post("/api/payments/webhook")
    .set("x-webhook-signature", process.env.WEBHOOK_SECRET)
    .send({
      payment_id: providerPaymentId,
      providerPaymentId,
      referenceId,
      event_id: eventId,
      eventId,
      status,
      provider: "bkash",
    });
}

describe("DokanX backend QA suite", () => {
  beforeEach(async () => {
    await clearData();
  });

  describe("Auth", () => {
    it("registers, logs in, and enforces token protection", async () => {
      const email = uniqueEmail("auth-user");
      const registerResponse = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Auth User",
          email,
          password: PASSWORD,
          role: "CUSTOMER",
        })
        .expect(201);

      expect(registerResponse.body.token).toBeTruthy();

      const token = await loginUser(email, `auth-login-${Date.now()}`);

      const protectedResponse = await request(app)
        .get("/api/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(protectedResponse.body.success).toBe(true);
      expect(protectedResponse.body.user.email).toBe(email);

      await request(app)
        .get("/api/me")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      await request(app)
        .get("/api/me")
        .expect(401);
    });
  });

  describe("Orders", () => {
    it("creates customer orders, returns owned orders, and allows valid merchant status transitions", async () => {
      const { owner, customerA, shop, product } = await bootstrapShopActors();
      await seedCustomerCash(customerA.user._id, 300);

      const createdOrder = await placeOrder({
        token: customerA.token,
        shopId: shop._id,
        productId: product._id,
        paymentMode: "WALLET",
        requestId: `orders-wallet-${Date.now()}`,
      });

      const myOrders = await request(app)
        .get("/api/orders/my")
        .set("Authorization", `Bearer ${customerA.token}`)
        .expect(200);

      expect(Array.isArray(myOrders.body.data)).toBe(true);
      expect(myOrders.body.data.some((row) => String(row._id) === String(createdOrder._id))).toBe(true);

      const orderDetails = await request(app)
        .get(`/api/orders/${createdOrder._id}`)
        .set("Authorization", `Bearer ${customerA.token}`)
        .expect(200);

      expect(String(orderDetails.body.data._id)).toBe(String(createdOrder._id));
      expect(String(orderDetails.body.data.customerId)).toBe(String(customerA.user._id));

      await request(app)
        .patch(`/api/orders/${createdOrder._id}/status`)
        .set("Authorization", `Bearer ${owner.token}`)
        .send({ status: "SHIPPED" })
        .expect(200);

      const updatedOrder = await Order.findById(createdOrder._id).lean();
      expect(updatedOrder.status).toBe("SHIPPED");

      await request(app)
        .patch(`/api/orders/${createdOrder._id}/status`)
        .set("Authorization", `Bearer ${owner.token}`)
        .send({ status: "CONFIRMED" })
        .expect(400);
    });
  });

  describe("Payments", () => {
    it("handles success, failure, and duplicate payment webhooks without duplicate ledger rows", async () => {
      const { customerA, shop, product } = await bootstrapShopActors();

      const failedOrder = await placeOrder({
        token: customerA.token,
        shopId: shop._id,
        productId: product._id,
        paymentMode: "ONLINE",
        totalAmount: 110,
        requestId: `payment-failed-order-${Date.now()}`,
      });

      const failedInit = await initiatePayment({ token: customerA.token, orderId: failedOrder._id });
      await sendPaymentWebhook({
        providerPaymentId: failedInit.providerPaymentId,
        status: "FAILED",
        eventId: `evt-failed-${Date.now()}`,
      }).expect(200);

      const failedFreshOrder = await Order.findById(failedOrder._id).lean();
      const failedEntries = await AccountingEntry.find({ referenceId: String(failedOrder._id) }).lean();
      expect(failedFreshOrder.paymentStatus).toBe("FAILED");
      expect(failedFreshOrder.status).toBe("PAYMENT_FAILED");
      expect(failedEntries).toHaveLength(0);

      const successOrder = await placeOrder({
        token: customerA.token,
        shopId: shop._id,
        productId: product._id,
        paymentMode: "ONLINE",
        totalAmount: 125,
        requestId: `payment-success-order-${Date.now()}`,
      });

      const successInit = await initiatePayment({ token: customerA.token, orderId: successOrder._id });
      const firstSuccessEventId = `evt-success-${Date.now()}`;

      await sendPaymentWebhook({
        providerPaymentId: successInit.providerPaymentId,
        status: "SUCCESS",
        eventId: firstSuccessEventId,
      }).expect(200);

      const duplicateWebhook = await sendPaymentWebhook({
        providerPaymentId: successInit.providerPaymentId,
        status: "SUCCESS",
        eventId: `evt-success-duplicate-${Date.now()}`,
      }).expect(200);

      expect(duplicateWebhook.body.duplicate).toBe(true);

      const [freshOrder, attempt, entries] = await Promise.all([
        Order.findById(successOrder._id).lean(),
        PaymentAttempt.findOne({ order: successOrder._id }).lean(),
        AccountingEntry.find({ referenceId: String(successOrder._id), transactionType: "income" }).lean(),
      ]);

      expect(freshOrder.paymentStatus).toBe("SUCCESS");
      expect(freshOrder.status).toBe("CONFIRMED");
      expect(attempt.processed).toBe(true);
      expect(entries).toHaveLength(1);
      expect(Number(entries[0].amount)).toBe(125);
    });
  });

  describe("Wallet", () => {
    it("fetches customer wallet balance and deducts correctly for wallet payments", async () => {
      const { customerA, shop, product } = await bootstrapShopActors();
      await seedCustomerCash(customerA.user._id, 300);

      const before = await request(app)
        .get("/api/wallet/me")
        .set("Authorization", `Bearer ${customerA.token}`)
        .expect(200);

      expect(Number(before.body.data.balance.cash)).toBe(300);

      await placeOrder({
        token: customerA.token,
        shopId: shop._id,
        productId: product._id,
        paymentMode: "WALLET",
        totalAmount: 100,
        requestId: `wallet-order-${Date.now()}`,
      });

      const after = await request(app)
        .get("/api/wallet/me")
        .set("Authorization", `Bearer ${customerA.token}`)
        .expect(200);

      expect(Number(after.body.data.balance.cash)).toBe(200);
      expect(Number(after.body.data.balance.cash)).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Credit", () => {
    it("supports credit purchase, wallet repayment, and online repayment success/failure flows", async () => {
      const { owner, customerA, shop, product } = await bootstrapShopActors();
      await seedCustomerCash(customerA.user._id, 500);
      await setCreditLimit({
        ownerToken: owner.token,
        customerGlobalId: customerA.user.globalCustomerId,
        shopId: shop._id,
        creditLimit: 1000,
      });

      const creditOrderOne = await placeOrder({
        token: customerA.token,
        shopId: shop._id,
        productId: product._id,
        paymentMode: "CREDIT",
        totalAmount: 100,
        requestId: `credit-order-wallet-${Date.now()}`,
      });

      const saleOne = await CreditSale.findOne({ orderId: creditOrderOne._id }).lean();
      expect(Number(saleOne.outstandingAmount)).toBe(100);

      await request(app)
        .post("/api/credit/payments")
        .set("Authorization", `Bearer ${customerA.token}`)
        .set("x-request-id", `credit-wallet-repay-${Date.now()}`)
        .set("idempotency-key", `idem-credit-wallet-${Date.now()}`)
        .send({
          creditSaleId: saleOne._id,
          amount: 100,
          referenceId: `credit-wallet-${Date.now()}`,
          paymentMode: "WALLET",
        })
        .expect(200);

      const saleOneAfter = await CreditSale.findById(saleOne._id).lean();
      expect(Number(saleOneAfter.outstandingAmount)).toBe(0);
      expect(saleOneAfter.status).toBe("PAID");

      const creditOrderTwo = await placeOrder({
        token: customerA.token,
        shopId: shop._id,
        productId: product._id,
        paymentMode: "CREDIT",
        totalAmount: 90,
        requestId: `credit-order-online-success-${Date.now()}`,
      });

      const saleTwo = await CreditSale.findOne({ orderId: creditOrderTwo._id }).lean();
      const onlineRefSuccess = `credit-online-success-${Date.now()}`;

      await request(app)
        .post("/api/credit/payments")
        .set("Authorization", `Bearer ${customerA.token}`)
        .set("x-request-id", `credit-online-pending-${Date.now()}`)
        .set("idempotency-key", `idem-${onlineRefSuccess}`)
        .send({
          creditSaleId: saleTwo._id,
          amount: 90,
          referenceId: onlineRefSuccess,
          paymentMode: "ONLINE",
          provider: "bkash",
        })
        .expect(200);

      const pendingSale = await CreditSale.findById(saleTwo._id).lean();
      const pendingPayment = pendingSale.payments.find((row) => String(row.referenceId) === onlineRefSuccess);
      expect(pendingPayment).toBeTruthy();
      expect(pendingPayment.status).toBe("PENDING");
      expect(Number(pendingSale.outstandingAmount)).toBe(90);

      await sendPaymentWebhook({
        providerPaymentId: `credit-provider-success-${Date.now()}`,
        referenceId: onlineRefSuccess,
        status: "SUCCESS",
        eventId: `evt-credit-success-${Date.now()}`,
      }).expect(200);

      const saleTwoAfter = await CreditSale.findById(saleTwo._id).lean();
      const successPayment = saleTwoAfter.payments.find((row) => String(row.referenceId) === onlineRefSuccess);
      expect(Number(saleTwoAfter.outstandingAmount)).toBe(0);
      expect(saleTwoAfter.status).toBe("PAID");
      expect(successPayment.status).toBe("CONFIRMED");

      const creditOrderThree = await placeOrder({
        token: customerA.token,
        shopId: shop._id,
        productId: product._id,
        paymentMode: "CREDIT",
        totalAmount: 70,
        requestId: `credit-order-online-failed-${Date.now()}`,
      });

      const saleThree = await CreditSale.findOne({ orderId: creditOrderThree._id }).lean();
      const onlineRefFail = `credit-online-fail-${Date.now()}`;

      await request(app)
        .post("/api/credit/payments")
        .set("Authorization", `Bearer ${customerA.token}`)
        .set("x-request-id", `credit-online-fail-${Date.now()}`)
        .set("idempotency-key", `idem-${onlineRefFail}`)
        .send({
          creditSaleId: saleThree._id,
          amount: 70,
          referenceId: onlineRefFail,
          paymentMode: "ONLINE",
          provider: "bkash",
        })
        .expect(200);

      const failedPendingSale = await CreditSale.findById(saleThree._id).lean();
      const failedPendingPayment = failedPendingSale.payments.find((row) => String(row.referenceId) === onlineRefFail);
      expect(failedPendingPayment.status).toBe("PENDING");
      expect(Number(failedPendingSale.outstandingAmount)).toBe(70);

      await sendPaymentWebhook({
        providerPaymentId: `credit-provider-failed-${Date.now()}`,
        referenceId: onlineRefFail,
        status: "FAILED",
        eventId: `evt-credit-failed-${Date.now()}`,
      }).expect(200);

      const saleThreeAfter = await CreditSale.findById(saleThree._id).lean();
      const failedPayment = saleThreeAfter.payments.find((row) => String(row.referenceId) === onlineRefFail);
      expect(Number(saleThreeAfter.outstandingAmount)).toBe(70);
      expect(saleThreeAfter.status).not.toBe("PAID");
      expect(failedPayment.status).toBe("FAILED");
    });
  });

  describe("Multi-user isolation", () => {
    it("forbids one customer from accessing another customer's order", async () => {
      const { customerA, customerB, shop, product } = await bootstrapShopActors({ withSecondCustomer: true });
      await seedCustomerCash(customerA.user._id, 200);

      const order = await placeOrder({
        token: customerA.token,
        shopId: shop._id,
        productId: product._id,
        paymentMode: "WALLET",
        requestId: `multi-user-order-${Date.now()}`,
      });

      await request(app)
        .get(`/api/orders/${order._id}`)
        .set("Authorization", `Bearer ${customerB.token}`)
        .expect(403);
    });
  });

  describe("Ledger safety", () => {
    it("keeps reconciliation clean after mixed financial actions", async () => {
      const { owner, customerA, shop, product } = await bootstrapShopActors();
      await seedCustomerCash(customerA.user._id, 600);
      await setCreditLimit({
        ownerToken: owner.token,
        customerGlobalId: customerA.user.globalCustomerId,
        shopId: shop._id,
        creditLimit: 1000,
      });

      await placeOrder({
        token: customerA.token,
        shopId: shop._id,
        productId: product._id,
        paymentMode: "WALLET",
        totalAmount: 100,
        requestId: `ledger-wallet-${Date.now()}`,
      });

      const onlineOrder = await placeOrder({
        token: customerA.token,
        shopId: shop._id,
        productId: product._id,
        paymentMode: "ONLINE",
        totalAmount: 120,
        requestId: `ledger-online-${Date.now()}`,
      });
      const init = await initiatePayment({ token: customerA.token, orderId: onlineOrder._id });
      await sendPaymentWebhook({
        providerPaymentId: init.providerPaymentId,
        status: "SUCCESS",
        eventId: `evt-ledger-online-${Date.now()}`,
      }).expect(200);

      const creditOrder = await placeOrder({
        token: customerA.token,
        shopId: shop._id,
        productId: product._id,
        paymentMode: "CREDIT",
        totalAmount: 80,
        requestId: `ledger-credit-${Date.now()}`,
      });
      const sale = await CreditSale.findOne({ orderId: creditOrder._id }).lean();
      await request(app)
        .post("/api/credit/payments")
        .set("Authorization", `Bearer ${customerA.token}`)
        .set("x-request-id", `ledger-credit-pay-${Date.now()}`)
        .set("idempotency-key", `idem-ledger-credit-pay-${Date.now()}`)
        .send({
          creditSaleId: sale._id,
          amount: 80,
          referenceId: `ledger-credit-repay-${Date.now()}`,
          paymentMode: "WALLET",
        })
        .expect(200);

      const report = await getShopReconciliationReport(shop._id);
      expect(report.hasMismatch).toBe(false);
      expect(Array.isArray(report.missingLedgerEntries)).toBe(true);
      expect(report.missingLedgerEntries).toHaveLength(0);
      const invariantReport = await assertShopFinancialInvariant({ shopId: shop._id });
      expect(invariantReport).toMatchObject({
        shopId: String(shop._id),
        hasMismatch: false,
      });
    });
  });
});
