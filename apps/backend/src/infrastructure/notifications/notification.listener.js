const eventBus = require("@/infrastructure/events/eventBus");
const { addJob } = require("@/core/infrastructure");
const Order = require("@/models/order.model");
const Shop = require("@/models/shop.model");
const User = require("@/models/user.model");
const Product = require("@/models/product.model");
const {
  resolveCustomerId,
  resolveShopId,
} = require("@/utils/order-normalization.util");

async function enqueueNotification({ userId, templateKey, payload, eventType }) {
  if (!userId || !templateKey) return;
  await addJob(
    "notification",
    { userId, templateKey, payload, eventType },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );
}

async function loadOrder(payload) {
  const orderId = payload?.orderId || payload?.order?._id || payload?._id || payload?.order;
  if (!orderId) return null;
  return Order.findById(orderId).lean();
}

async function loadShop(shopId) {
  if (!shopId) return null;
  return Shop.findById(shopId).lean();
}

async function notifyAdmins(templateKey, payload, eventType) {
  const admins = await User.find({ role: "ADMIN" }).select("_id").lean();
  for (const admin of admins) {
    await enqueueNotification({
      userId: admin._id,
      templateKey,
      payload,
      eventType,
    });
  }
}

async function handleOrderEvent(eventType, payload, templates) {
  const order = await loadOrder(payload);
  if (!order) return;

  const shopId = resolveShopId(order);
  const shop = await loadShop(shopId);
  const customerId = resolveCustomerId(order);
  const merchantId = shop?.owner;

  const sharedPayload = {
    ...payload,
    orderId: order._id,
    amount: order.totalAmount,
    shopId,
    shopName: shop?.name || "",
  };

  if (customerId && templates.customer) {
    await enqueueNotification({
      userId: customerId,
      templateKey: templates.customer,
      payload: sharedPayload,
      eventType,
    });
  }

  if (merchantId && templates.merchant) {
    await enqueueNotification({
      userId: merchantId,
      templateKey: templates.merchant,
      payload: sharedPayload,
      eventType,
    });
  }

  if (templates.admin) {
    await notifyAdmins(templates.admin, sharedPayload, eventType);
  }
}

async function handleInventoryLowStock(eventType, payload) {
  const productId = payload?.productId;
  const shopId = payload?.shopId;
  const product = productId ? await Product.findById(productId).lean() : null;
  const shop = await loadShop(shopId);
  const merchantId = shop?.owner;

  if (!merchantId) return;

  const sharedPayload = {
    ...payload,
    productName: product?.name || payload?.productName || "",
    shopName: shop?.name || "",
  };

  await enqueueNotification({
    userId: merchantId,
    templateKey: "inventory.low_stock.merchant",
    payload: sharedPayload,
    eventType,
  });
}

eventBus.on("USER_NOTIFICATION", async ({ userId, event, payload }) => {
  await enqueueNotification({
    userId,
    templateKey: event,
    payload,
    eventType: event,
  });
});

eventBus.on("ORDER_CREATED", async (payload) => {
  await handleOrderEvent("ORDER_CREATED", payload, {
    customer: "order.created.customer",
    merchant: "order.created.merchant",
    admin: "admin.order.created",
  });
});

eventBus.on("order.placed", async (payload) => {
  await handleOrderEvent("order.placed", payload, {
    customer: "order.created.customer",
    merchant: "order.created.merchant",
    admin: "admin.order.created",
  });
});

eventBus.on("order.confirmed", async (payload) => {
  await handleOrderEvent("order.confirmed", payload, {
    customer: "order.confirmed.customer",
  });
});

eventBus.on("order.shipped", async (payload) => {
  await handleOrderEvent("order.shipped", payload, {
    customer: "order.shipped.customer",
  });
});

eventBus.on("order.out_for_delivery", async (payload) => {
  await handleOrderEvent("order.out_for_delivery", payload, {
    customer: "order.out_for_delivery.customer",
  });
});

eventBus.on("order.delivered", async (payload) => {
  await handleOrderEvent("order.delivered", payload, {
    customer: "order.delivered.customer",
  });
});

eventBus.on("payment.received", async (payload) => {
  await handleOrderEvent("payment.received", payload, {
    customer: "payment.received.customer",
    merchant: "payment.received.merchant",
  });
});

eventBus.on("payment.success", async (payload) => {
  await handleOrderEvent("payment.success", payload, {
    customer: "payment.received.customer",
    merchant: "payment.received.merchant",
  });
});

eventBus.on("inventory.low_stock", async (payload) => {
  await handleInventoryLowStock("inventory.low_stock", payload);
});

eventBus.on("PAYOUT_COMPLETED", async (payload) => {
  const shopId = payload?.shopId;
  const shop = await loadShop(shopId);
  const merchantId = shop?.owner;
  if (!merchantId) return;

  await enqueueNotification({
    userId: merchantId,
    templateKey: "payout.completed.merchant",
    payload: {
      ...payload,
      shopName: shop?.name || "",
    },
    eventType: "payout.completed",
  });
});

console.log("Notification listener registered");
