import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:5001";
const ORDER_TOKEN = __ENV.ORDER_TOKEN || "";
const PAYMENT_TOKEN = __ENV.PAYMENT_TOKEN || ORDER_TOKEN;
const SHOP_ID = __ENV.SHOP_ID || "";
const PRODUCT_ID = __ENV.PRODUCT_ID || "";
const ORDER_ID = __ENV.ORDER_ID || "";
const ENABLE_ORDER_FLOW = String(__ENV.ENABLE_ORDER_FLOW || "false").toLowerCase() === "true";
const ENABLE_PAYMENT_FLOW = String(__ENV.ENABLE_PAYMENT_FLOW || "false").toLowerCase() === "true";
const SEARCH_TERM = __ENV.SEARCH_TERM || "rice";
const ORDER_PRICE = Number(__ENV.ORDER_PRICE || 100);

export const options = {
  scenarios: {
    browse_products: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "1m", target: 25 },
        { duration: "30s", target: 0 },
      ],
      exec: "browseProducts",
    },
    search_catalog: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "30s", target: 5 },
        { duration: "1m", target: 15 },
        { duration: "30s", target: 0 },
      ],
      exec: "searchCatalog",
    },
    place_orders: {
      executor: "constant-vus",
      vus: ENABLE_ORDER_FLOW ? 3 : 0,
      duration: "1m",
      exec: "placeOrder",
    },
    initiate_payments: {
      executor: "constant-vus",
      vus: ENABLE_PAYMENT_FLOW ? 2 : 0,
      duration: "1m",
      exec: "initiatePayment",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1200", "p(99)<2500"],
    "http_req_duration{scenario:browse_products}": ["p(95)<1000"],
    "http_req_duration{scenario:search_catalog}": ["p(95)<1200"],
    "http_req_duration{scenario:place_orders}": ["p(95)<1800"],
    "http_req_duration{scenario:initiate_payments}": ["p(95)<1800"],
  },
};

function authHeaders(token) {
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

export function browseProducts() {
  const res = http.get(
    `${BASE_URL}/api/products?shopId=${encodeURIComponent(SHOP_ID)}&limit=24`,
    { headers: authHeaders(ORDER_TOKEN) }
  );

  check(res, {
    "products status is 200": (r) => r.status === 200,
  });

  sleep(1);
}

export function searchCatalog() {
  const res = http.get(
    `${BASE_URL}/api/search?q=${encodeURIComponent(SEARCH_TERM)}&shopId=${encodeURIComponent(SHOP_ID)}&limit=12`,
    {
      headers: {
        ...authHeaders(ORDER_TOKEN),
        "x-search-id": `k6-${__VU}-${__ITER}`,
      },
    }
  );

  check(res, {
    "search status is 200": (r) => r.status === 200,
  });

  sleep(1);
}

export function placeOrder() {
  if (!ENABLE_ORDER_FLOW || !SHOP_ID || !PRODUCT_ID || !ORDER_TOKEN) {
    sleep(1);
    return;
  }

  const payload = JSON.stringify({
    shopId: SHOP_ID,
    items: [{ product: PRODUCT_ID, quantity: 1, price: ORDER_PRICE }],
    addressId: "default",
    totalAmount: ORDER_PRICE,
    paymentMode: "ONLINE",
  });

  const res = http.post(`${BASE_URL}/api/orders`, payload, {
    headers: {
      ...authHeaders(ORDER_TOKEN),
      "Content-Type": "application/json",
      "Idempotency-Key": `k6-order-${__VU}-${__ITER}`,
    },
  });

  check(res, {
    "order status is 201": (r) => r.status === 201,
  });
}

export function initiatePayment() {
  if (!ENABLE_PAYMENT_FLOW || !ORDER_ID || !PAYMENT_TOKEN) {
    sleep(1);
    return;
  }

  const payload = JSON.stringify({ provider: "bkash" });
  const res = http.post(`${BASE_URL}/api/payments/initiate/${ORDER_ID}`, payload, {
    headers: {
      ...authHeaders(PAYMENT_TOKEN),
      "Content-Type": "application/json",
      "Idempotency-Key": `k6-payment-${__VU}-${__ITER}`,
    },
  });

  check(res, {
    "payment initiate status is 201": (r) => r.status === 201,
  });

  sleep(1);
}
