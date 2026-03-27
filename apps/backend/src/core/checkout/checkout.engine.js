const mongoose = require("mongoose");

const Order = require("@/models/order.model");
const Product = require("@/models/product.model");
const PaymentAttempt = require("@/models/paymentAttempt.model");

const inventory = require("@/inventory");
const { withLock } = require("@/core/infrastructure/lock.manager");
const { publishEvent } = require("@/infrastructure/events/event.dispatcher");
const logger = require("@/core/infrastructure/logger");
const walletService = require("@/services/wallet.service");
const {
  resolveCustomerId,
  resolveShopId,
} = require("@/utils/order-normalization.util");

function addDays(date, durationDays) {
  const result = new Date(date);
  result.setDate(result.getDate() + Number(durationDays || 0));
  return result;
}

function buildProtectionSnapshot(items, productsById, key, createdAt) {
  return (items || []).reduce((acc, item) => {
    const productId = String(item.product || "");
    if (!productId) return acc;
    const product = productsById.get(productId);
    const config = product?.[key] || {};
    const enabled = Boolean(config.enabled);
    const durationDays = Number(config.durationDays || 0);
    if (!enabled) return acc;
    acc.push({
      productId: item.product,
      enabled,
      durationDays,
      type: config.type || null,
      expiryDate: durationDays > 0 ? addDays(createdAt, durationDays) : createdAt,
    });
    return acc;
  }, []);
}

async function checkout({
  shopId,
  shop,
  customerId,
  customer,
  user,
  items,
  addressId = null,
  deliveryMode = "standard",
  totalAmount,
  trafficType = "marketplace",
  deliveryAddress = null,
  campaignId = null,
  paymentMode = "ONLINE",
  notes = "",
  multiShopGroup = null,
  metadata = {},
  session = null,
}) {
  const normalizedShopId = resolveShopId({ shopId, shop });
  const normalizedCustomerId = resolveCustomerId({ customerId, customer, user });
  const allowedPaymentModes = new Set(["ONLINE", "COD", "WALLET", "CREDIT"]);
  const normalizedPaymentMode = String(paymentMode || "ONLINE").toUpperCase();
  const customerAddresses = Array.isArray(user?.addresses) ? user.addresses : [];
  const selectedAddress =
    (addressId
      ? customerAddresses.find((address) => String(address.id || "") === String(addressId))
      : customerAddresses.find((address) => address.isDefault)) || null;
  const resolvedDeliveryAddress = selectedAddress
    ? {
        line1: selectedAddress.line1 || "",
        city: selectedAddress.city || "",
        area: "",
        postalCode: "",
        country: "",
      }
    : (deliveryAddress || {});

  if (!normalizedShopId && !multiShopGroup) {
    throw new Error("shopId is required");
  }
  if (!Array.isArray(items) || !items.length) {
    throw new Error("At least one item is required");
  }
  if (!allowedPaymentModes.has(normalizedPaymentMode)) {
    throw new Error("Unsupported paymentMode");
  }
  if (!addressId && !resolvedDeliveryAddress?.line1) {
    throw new Error("addressId or deliveryAddress is required");
  }

  return withLock(`checkout:${normalizedCustomerId || "guest"}`, async () => {
    const ownedSession = !session;
    const activeSession = session || await mongoose.startSession();

    try {
      if (ownedSession) {
        activeSession.startTransaction();
      }

      const products = await Product.find({
        _id: { $in: (items || []).map((item) => item.product).filter(Boolean) },
      })
        .select("warranty guarantee")
        .lean();
      const productsById = new Map(products.map((product) => [String(product._id), product]));
      const orderCreatedAt = new Date();

      const orderPayload = {
        shop: normalizedShopId,
        shopId: normalizedShopId,
        customer: normalizedCustomerId,
        customerId: normalizedCustomerId,
        user: normalizedCustomerId,
        items,
        totalAmount,
        status: "PAYMENT_PENDING",
        trafficType,
        deliveryAddress: resolvedDeliveryAddress,
        campaignId,
        paymentMode: normalizedPaymentMode,
        metadata: {
          ...metadata,
          addressId: addressId || selectedAddress?.id || null,
          deliveryMode: String(deliveryMode || "standard"),
          notes: String(notes || ""),
          multiShopGroup: multiShopGroup || null,
        },
        warrantySnapshot: buildProtectionSnapshot(items, productsById, "warranty", orderCreatedAt),
        guaranteeSnapshot: buildProtectionSnapshot(items, productsById, "guarantee", orderCreatedAt),
        createdAt: orderCreatedAt,
        updatedAt: orderCreatedAt,
      };

      const order = (await Order.create([orderPayload], { session: activeSession }))[0];
      logger.info({
        event: "CHECKOUT_ORDER_CREATED",
        orderId: String(order._id),
        requestShopId: normalizedShopId ? String(normalizedShopId) : null,
        customerId: normalizedCustomerId ? String(normalizedCustomerId) : null,
        paymentMode: normalizedPaymentMode,
        totalAmount: Number(totalAmount || 0),
      }, "Checkout order created");

      await inventory.createInventoryEntry({
        shopId: normalizedShopId,
        items,
        type: "RESERVATION",
        direction: "OUT",
        referenceId: String(order._id),
        meta: { orderId: order._id },
        session: activeSession,
      });

      const attempt = (
        await PaymentAttempt.create(
          [{
            order: order._id,
            shopId: normalizedShopId,
            amount: totalAmount,
            provider: normalizedPaymentMode === "WALLET" ? "wallet" : "sandbox",
            gateway: normalizedPaymentMode === "WALLET" ? "wallet" : "sandbox",
            providerPaymentId: `pay_${order._id}`,
            status: normalizedPaymentMode === "WALLET" ? "SUCCESS" : "PENDING",
            processed: normalizedPaymentMode === "WALLET",
            processedAt: normalizedPaymentMode === "WALLET" ? orderCreatedAt : null,
          }],
          { session: activeSession }
        )
      )[0];

      if (normalizedPaymentMode === "WALLET") {
        await walletService.debitCustomerWallet({
          userId: user?._id || user?.id || null,
          globalCustomerId: user?.globalCustomerId || null,
          shopId: normalizedShopId,
          amount: totalAmount,
          walletType: "CASH",
          referenceId: String(order._id),
          metadata: {
            orderId: String(order._id),
            note: "Customer wallet payment",
            source: "checkout_wallet_payment",
          },
          session: activeSession,
        });

        await walletService.addTransaction({
          shopId: normalizedShopId,
          customerId: user?.globalCustomerId || null,
          type: "income",
          walletType: "CASH",
          amount: totalAmount,
          referenceId: String(order._id),
          metadata: {
            orderId: String(order._id),
            paymentAttempt: attempt._id,
            source: "checkout_wallet_payment",
          },
          session: activeSession,
        });

        order.paymentStatus = "SUCCESS";
        order.status = "CONFIRMED";
        await order.save({ session: activeSession });
        logger.info({
          event: "CHECKOUT_WALLET_PAYMENT_COMPLETED",
          orderId: String(order._id),
          customerId: normalizedCustomerId ? String(normalizedCustomerId) : null,
          shopId: normalizedShopId ? String(normalizedShopId) : null,
          amount: Number(totalAmount || 0),
        }, "Wallet checkout completed");
      }

      if (ownedSession) {
        await activeSession.commitTransaction();
      }

      await publishEvent("ORDER_CREATED", { order });

      return {
        ...order.toObject(),
        orderId: order._id,
        attemptId: attempt._id,
      };
    } catch (error) {
      if (ownedSession) {
        await activeSession.abortTransaction();
      }
      throw error;
    } finally {
      if (ownedSession) {
        activeSession.endSession();
      }
    }
  });
}

module.exports = {
  checkout,
};
