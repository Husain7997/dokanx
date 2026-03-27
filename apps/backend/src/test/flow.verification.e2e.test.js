jest.useRealTimers();

const request = require("supertest");
const mongoose = require("mongoose");

const app = require("../app");
const User = require("../models/user.model");
const Shop = require("../models/shop.model");
const Product = require("../models/product.model");
const ShopLocation = require("../models/shopLocation.model");
const Order = require("../models/order.model");
const PaymentAttempt = require("../models/paymentAttempt.model");
const Shipment = require("../models/shipment.model");
const AccountingEntry = require("../modules/wallet-engine/accountingEntry.model");
const CreditAccount = require("../modules/credit/credit.account.model");
const CreditSale = require("../modules/credit-engine/creditSale.model");
const CreditLedger = require("../modules/credit/credit.ledger.model");
const WarrantyClaim = require("../modules/warranty-engine/warrantyClaim.model");
const CustomerIdentity = require("../modules/customer/customer.identity.model");
const Inventory = require("../models/Inventory.model");

const PASSWORD = "Passw0rd!";

async function clearData() {
  await Promise.all([
    WarrantyClaim.deleteMany({}),
    Shipment.deleteMany({}),
    PaymentAttempt.deleteMany({}),
    CreditLedger.deleteMany({}),
    CreditSale.deleteMany({}),
    CreditAccount.deleteMany({}),
    AccountingEntry.deleteMany({}),
    Order.deleteMany({}),
    Inventory.deleteMany({}),
    Product.deleteMany({}),
    ShopLocation.deleteMany({}),
    Shop.deleteMany({}),
    CustomerIdentity.deleteMany({}),
    User.deleteMany({}),
  ]);
}

async function registerUser({ name, email, role }) {
  const response = await request(app)
    .post("/api/auth/register")
    .send({ name, email, password: PASSWORD, role })
    .expect(201);

  return response.body.user;
}

async function loginUser(email, requestId) {
  const response = await request(app)
    .post("/api/auth/login")
    .set("x-request-id", requestId)
    .send({ email, password: PASSWORD })
    .expect(200);

  expect(response.headers["x-request-id"]).toBe(requestId);
  return response.body.token;
}

async function createShopAsOwner(token, name = `Shop ${Date.now()}`) {
  const response = await request(app)
    .post("/api/shops")
    .set("Authorization", `Bearer ${token}`)
    .set("x-request-id", `req-shop-${Date.now()}`)
    .send({ name, currency: "BDT", timezone: "Asia/Dhaka", locale: "en" })
    .expect(201);

  return response.body.shop;
}

async function createProductAsOwner(token, body) {
  const response = await request(app)
    .post("/api/products")
    .set("Authorization", `Bearer ${token}`)
    .set("x-request-id", `req-product-${Date.now()}`)
    .send(body)
    .expect(201);

  return response.body.product;
}

async function bootstrapActors() {
  const ownerEmail = `owner-${Date.now()}@test.com`;
  const customerEmail = `customer-${Date.now()}@test.com`;

  await registerUser({ name: "Owner", email: ownerEmail, role: "OWNER" });
  await registerUser({ name: "Customer", email: customerEmail, role: "CUSTOMER" });

  const ownerToken = await loginUser(ownerEmail, `login-owner-${Date.now()}`);
  const customerToken = await loginUser(customerEmail, `login-customer-${Date.now()}`);
  const shop = await createShopAsOwner(ownerToken);
  const product = await createProductAsOwner(ownerToken, {
    name: "Flow Product",
    price: 100,
    stock: 10,
    slug: `flow-product-${Date.now()}`,
    warranty: {
      enabled: true,
      durationDays: 30,
      type: "service",
    },
  });

  await ShopLocation.create({
    shopId: shop._id,
    name: "Main Branch",
    address: "1 Test Street",
    city: "Dhaka",
    country: "Bangladesh",
    coordinates: {
      type: "Point",
      coordinates: [90.4125, 23.8103],
    },
    isActive: true,
  });

  const customer = await User.findOne({ email: customerEmail });
  return {
    ownerToken,
    customerToken,
    shop,
    product,
    customer,
  };
}

async function placeOrder({ token, shopId, productId, paymentMode, requestId, totalAmount = 100 }) {
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
    })
    ;

  if (response.status !== 201) {
    throw new Error(`ORDER_CREATE_FAILED ${response.status}: ${JSON.stringify(response.body)}`);
  }

  expect(response.headers["x-request-id"]).toBe(requestId);
  return response.body.data;
}

describe("DokanX real user journeys", () => {
  beforeEach(async () => {
    await clearData();
  });

  it("Wallet payment", async () => {
    const { customerToken, shop, product, customer } = await bootstrapActors();
    await User.findByIdAndUpdate(customer._id, {
      $set: {
        "customerWallet.cash": 500,
        "customerWallet.credit": 0,
        "customerWallet.bank": 0,
      },
    });

    const order = await placeOrder({
      token: customerToken,
      shopId: shop._id,
      productId: product._id,
      paymentMode: "WALLET",
      requestId: `wallet-${Date.now()}`,
    });

    const [freshOrder, ledgerRows, freshCustomer] = await Promise.all([
      Order.findById(order._id).lean(),
      AccountingEntry.find({ referenceId: String(order._id) }).lean(),
      User.findById(customer._id).lean(),
    ]);

    expect(freshOrder.paymentStatus).toBe("SUCCESS");
    expect(freshOrder.status).toBe("CONFIRMED");
    expect(Number(freshCustomer.customerWallet.cash)).toBe(400);
    expect(ledgerRows.some((row) => row.transactionType === "expense" && Number(row.amount) === 100)).toBe(true);
    expect(ledgerRows.some((row) => row.transactionType === "income" && Number(row.amount) === 100)).toBe(true);
  }, 30000);

  it("Credit purchase", async () => {
    const { ownerToken, customerToken, shop, product, customer } = await bootstrapActors();

    await request(app)
      .post("/api/credit/limits")
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("x-request-id", `credit-limit-${Date.now()}`)
      .send({
        customerId: customer.globalCustomerId,
        shopId: shop._id,
        creditLimit: 500,
      })
      .expect(200);

    const order = await placeOrder({
      token: customerToken,
      shopId: shop._id,
      productId: product._id,
      paymentMode: "CREDIT",
      requestId: `credit-purchase-${Date.now()}`,
    });

    const [freshOrder, sale, account, issuedLedger] = await Promise.all([
      Order.findById(order._id).lean(),
      CreditSale.findOne({ orderId: order._id }).lean(),
      CreditAccount.findOne({ shopId: shop._id, customerId: customer.globalCustomerId }).lean(),
      CreditLedger.findOne({ reference: String(order._id), type: "CREDIT_ISSUED" }).lean(),
    ]);

    expect(freshOrder.paymentMode).toBe("CREDIT");
    expect(freshOrder.paymentStatus).toBe("UNPAID");
    expect(freshOrder.status).toBe("CONFIRMED");
    expect(Number(sale.outstandingAmount)).toBe(100);
    expect(Number(account.outstandingBalance)).toBe(100);
    expect(Number(issuedLedger.amount)).toBe(100);
  }, 30000);

  it("Credit repayment", async () => {
    const { ownerToken, customerToken, shop, product, customer } = await bootstrapActors();
    await User.findByIdAndUpdate(customer._id, {
      $set: {
        "customerWallet.cash": 300,
      },
    });

    await request(app)
      .post("/api/credit/limits")
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("x-request-id", `credit-limit-${Date.now()}`)
      .send({
        customerId: customer.globalCustomerId,
        shopId: shop._id,
        creditLimit: 500,
      })
      .expect(200);

    const order = await placeOrder({
      token: customerToken,
      shopId: shop._id,
      productId: product._id,
      paymentMode: "CREDIT",
      requestId: `credit-order-${Date.now()}`,
    });

    const sale = await CreditSale.findOne({ orderId: order._id }).lean();
    const referenceId = `credit-repay-${Date.now()}`;

    await request(app)
      .post("/api/credit/payments")
      .set("Authorization", `Bearer ${customerToken}`)
      .set("x-request-id", `credit-repay-${Date.now()}`)
      .set("idempotency-key", `idem-${referenceId}`)
      .send({
        creditSaleId: sale._id,
        amount: 60,
        referenceId,
        paymentMode: "WALLET",
      })
      .expect(200);

    const [updatedSale, account, paymentLedger, walletLedger, freshCustomer] = await Promise.all([
      CreditSale.findById(sale._id).lean(),
      CreditAccount.findOne({ shopId: shop._id, customerId: customer.globalCustomerId }).lean(),
      CreditLedger.findOne({ reference: referenceId, type: "PAYMENT_RECEIVED" }).lean(),
      AccountingEntry.findOne({ referenceId, transactionType: "income", walletType: "CREDIT" }).lean(),
      User.findById(customer._id).lean(),
    ]);

    expect(Number(updatedSale.outstandingAmount)).toBe(40);
    expect(Number(account.outstandingBalance)).toBe(40);
    expect(Number(paymentLedger.amount)).toBe(60);
    expect(Number(walletLedger.amount)).toBe(60);
    expect(Number(freshCustomer.customerWallet.cash)).toBe(240);
  }, 30000);

  it("Online payment", async () => {
    const { customerToken, shop, product } = await bootstrapActors();
    const order = await placeOrder({
      token: customerToken,
      shopId: shop._id,
      productId: product._id,
      paymentMode: "ONLINE",
      requestId: `online-order-${Date.now()}`,
    });

    const initiate = await request(app)
      .post(`/api/payments/initiate/${order._id}`)
      .set("Authorization", `Bearer ${customerToken}`)
      .set("x-request-id", `payment-init-${Date.now()}`)
      .set("idempotency-key", `idem-pay-${Date.now()}`)
      .send({ provider: "bkash" })
      .expect(201);

    const webhookResponse = await request(app)
      .post("/api/payments/webhook")
      .set("x-webhook-signature", process.env.WEBHOOK_SECRET)
      .send({
        payment_id: initiate.body.providerPaymentId,
        event_id: `evt-${Date.now()}`,
        order_id: String(order._id),
        status: "SUCCESS",
      });

    if (webhookResponse.status !== 200) {
      throw new Error(`PAYMENT_WEBHOOK_FAILED ${webhookResponse.status}: ${JSON.stringify(webhookResponse.body)}`);
    }

    const [freshOrder, attempt, entry] = await Promise.all([
      Order.findById(order._id).lean(),
      PaymentAttempt.findOne({ order: order._id }).lean(),
      AccountingEntry.findOne({ referenceId: String(order._id), transactionType: "income" }).lean(),
    ]);

    expect(freshOrder.paymentStatus).toBe("SUCCESS");
    expect(freshOrder.status).toBe("CONFIRMED");
    expect(attempt.processed).toBe(true);
    expect(Number(entry.amount)).toBe(100);
  }, 30000);

  it("Order tracking", async () => {
    const { ownerToken, customerToken, shop, product, customer } = await bootstrapActors();
    await User.findByIdAndUpdate(customer._id, {
      $set: { "customerWallet.cash": 500 },
    });

    const order = await placeOrder({
      token: customerToken,
      shopId: shop._id,
      productId: product._id,
      paymentMode: "WALLET",
      requestId: `tracking-order-${Date.now()}`,
    });

    const shipmentResponse = await request(app)
      .post("/api/shipping/shipments")
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("x-request-id", `shipment-${Date.now()}`)
      .send({ orderId: order._id, carrier: "pathao" })
      .expect(201);

    const trackingNumber = shipmentResponse.body.data.trackingNumber;
    const trackingResponse = await request(app)
      .get(`/api/shipping/track/${trackingNumber}`)
      .expect(200);

    const freshOrder = await Order.findById(order._id).lean();
    expect(trackingResponse.body.data.trackingNumber).toBe(trackingNumber);
    expect(freshOrder.status).toBe("SHIPPED");
  }, 30000);

  it("Claim flow", async () => {
    const { ownerToken, customerToken, shop, product, customer } = await bootstrapActors();
    await User.findByIdAndUpdate(customer._id, {
      $set: { "customerWallet.cash": 500 },
    });

    const order = await placeOrder({
      token: customerToken,
      shopId: shop._id,
      productId: product._id,
      paymentMode: "WALLET",
      requestId: `claim-order-${Date.now()}`,
    });

    const claimCreate = await request(app)
      .post("/api/claims")
      .set("Authorization", `Bearer ${customerToken}`)
      .set("x-request-id", `claim-create-${Date.now()}`)
      .send({
        orderId: order._id,
        productId: product._id,
        customerId: customer.globalCustomerId,
        type: "warranty",
        reason: "Item failed during use",
      });

    if (claimCreate.status !== 201) {
      throw new Error(`CLAIM_CREATE_FAILED ${claimCreate.status}: ${JSON.stringify(claimCreate.body)}`);
    }

    const claim = claimCreate.body.data;

    await request(app)
      .put(`/api/claims/${claim._id}/status`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("x-request-id", `claim-resolve-${Date.now()}`)
      .send({
        status: "resolved",
        resolutionType: "refund",
        amount: 100,
        decisionNote: "Approved refund",
      })
      .expect(200);

    const updatedClaim = await WarrantyClaim.findById(claim._id).lean();
    const refundLedger = await AccountingEntry.findOne({
      referenceId: updatedClaim.refundReferenceId,
      transactionType: "expense",
    }).lean();

    expect(updatedClaim.status).toBe("resolved");
    expect(updatedClaim.resolutionType).toBe("refund");
    expect(updatedClaim.refundReferenceId).toBeTruthy();
    expect(Number(refundLedger.amount)).toBe(100);
  }, 30000);

  it("Map to shop to buy", async () => {
    const { customerToken, customer } = await bootstrapActors();
    await User.findByIdAndUpdate(customer._id, {
      $set: { "customerWallet.cash": 500 },
    });

    const shopSearch = await request(app)
      .get("/api/shops/public")
      .query({ lat: 23.8103, lng: 90.4125 })
      .set("x-request-id", `map-search-${Date.now()}`)
      .expect(200);

    expect(shopSearch.body.data.length).toBeGreaterThan(0);
    const selectedShop = shopSearch.body.data[0];

    const product = await Product.findOne({ shopId: selectedShop.shopId }).lean();
    const order = await placeOrder({
      token: customerToken,
      shopId: selectedShop.shopId,
      productId: product._id,
      paymentMode: "WALLET",
      requestId: `map-buy-${Date.now()}`,
    });

    const [freshOrder, ledgerRows] = await Promise.all([
      Order.findById(order._id).lean(),
      AccountingEntry.find({ referenceId: String(order._id) }).lean(),
    ]);

    expect(freshOrder.status).toBe("CONFIRMED");
    expect(ledgerRows.some((row) => row.transactionType === "income")).toBe(true);
    expect(ledgerRows.some((row) => row.transactionType === "expense")).toBe(true);
  }, 30000);
});
