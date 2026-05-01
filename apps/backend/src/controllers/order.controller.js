const {
  transitionOrder,
} = require("../services/orderState.service");
const Order = require("../models/order.model");
const mongoose = require("mongoose");


const CheckoutEngine =
require("@/core/checkout/checkout.engine");
const { publishEvent } = require("@/core/infrastructure");
const logger = require("../infrastructure/logger/logger");
const { t } =
  require('@/core/infrastructure');
const { addJob } = require("@/core/infrastructure");
const { createAudit } = require("../utils/audit.util");
const DeliveryGroup = require("../modules/delivery-engine/deliveryGroup.model");
const Shop = require("../models/shop.model");
const {
  createReadQuery,
  createReadOneQuery,
} = require("../infrastructure/database/mongo.client");

async function serializeCustomerOrder(orderDoc) {
  if (!orderDoc) return null;

  const order = orderDoc.toObject ? orderDoc.toObject() : orderDoc;
  const [shop, deliveryGroup] = await Promise.all([
    order.shopId ? Shop.findById(order.shopId).select("name slug domain").lean() : null,
    order.deliveryGroupId ? DeliveryGroup.findById(order.deliveryGroupId).lean() : null,
  ]);

  const items = (order.items || []).map((item) => {
    const productId = String(item.product?._id || item.product || "");
    const warrantyEligible = Array.isArray(order.warrantySnapshot)
      ? order.warrantySnapshot.some((row) => String(row.productId || "") === productId && row.enabled)
      : false;
    const guaranteeEligible = Array.isArray(order.guaranteeSnapshot)
      ? order.guaranteeSnapshot.some((row) => String(row.productId || "") === productId && row.enabled)
      : false;

    return {
      ...item,
      productId,
      claimEligibility: {
        warranty: warrantyEligible,
        guarantee: guaranteeEligible,
        any: warrantyEligible || guaranteeEligible,
      },
    };
  });

  return {
    ...order,
    items,
    shop: shop || null,
    deliveryGroup: deliveryGroup || null,
    claimEligibility: {
      orderLevel: items.some((item) => item.claimEligibility?.any),
      items: items.map((item) => ({
        productId: item.productId,
        ...item.claimEligibility,
      })),
    },
  };
}
exports.placeOrder = async (req, res) => {
  if (!req.user) {
    console.warn("ORDER_CREATE_MISSING_USER", {
      path: req.originalUrl || req.url,
      bodyKeys: Object.keys(req.body || {}),
    });
    return res.status(401).json({
      success: false,
      message: "Customer session required",
    });
  }

  const session = await mongoose.startSession();

  try {
    if (String(req.body?.paymentMode || "").toUpperCase() === "CREDIT") {
      const creditService = require("../modules/credit-engine/credit.service");
      await creditService.assertCreditEligibility({
        customerId: req.user?.globalCustomerId || req.user?._id,
        shopId: req.body.shopId || req.shop?._id || req.shop,
        amount: req.body.totalAmount,
      }, req.user);
    }

    let order;

    await session.withTransaction(async () => {

      order = await CheckoutEngine.checkout({
        shopId: req.body.shopId || req.shop?._id || req.shop,
        user: req.user,
        items: req.body.items,
        addressId: req.body.addressId || null,
        deliveryMode: req.body.deliveryMode || "standard",
        totalAmount: req.body.totalAmount,
        trafficType: req.traffic?.type || "marketplace",
        deliveryAddress: req.body.deliveryAddress || null,
        campaignId: req.body.campaignId || null,
        paymentMode: req.body.paymentMode || "ONLINE",
        notes: req.body.notes || "",
        multiShopGroup: req.body.multiShopGroup || null,
        metadata: {
          traffic: req.traffic || null,
          sourceHeaders: {
            trafficSource: req.headers["x-traffic-source"] || null,
          },
        },
        session
      });
      await publishEvent({
        type: "ORDER_CREATED",
        aggregateId: order._id,
        payload: order
      });

    });

    logger.info("Order created", {
      orderId: order._id
    });

    const searchId = req.headers["x-search-id"] ? String(req.headers["x-search-id"]) : null;
    const searchQuery = req.headers["x-search-query"] ? String(req.headers["x-search-query"]) : "";

    await createAudit({
      action: "ORDER_CREATED",
      performedBy: req.user?._id || null,
      targetType: "Order",
      targetId: order._id,
      req,
      meta: {
        totalAmount: Number(order.totalAmount || 0),
        channel: req.body?.channel || "WEB",
        deviceFingerprint: req.headers["x-device-fingerprint"] || null,
        couponCode: req.body?.couponCode || null,
      },
    });

    await addJob("order-post-create", {
      orderId: order._id,
      paymentMode: String(req.body?.paymentMode || order.paymentMode || "ONLINE").toUpperCase(),
      actorUserId: req.user?._id || null,
      searchId,
      searchQuery,
      requestMeta: {
        ip: req.ip,
        userAgent: req.headers["user-agent"] || "",
        deviceFingerprint: req.headers["x-device-fingerprint"] || "",
        couponCode: req.body?.couponCode || "",
        itemCount: Array.isArray(req.body.items) ? req.body.items.length : 0,
        totalAmount: Number(req.body.totalAmount || 0),
        shopId: req.body?.shopId || req.shop?._id || null,
      },
    }, {
      queueName: "payments",
      attempts: 3,
      backoff: { type: "exponential", delay: 3000 },
      removeOnComplete: true,
      removeOnFail: false,
    });

    res.status(201).json({
      message: t("order.created", req.lang),
      data: order
    });

  } catch (err) {
    logger.error("Order create failed", {
      requestId: req.requestId || req.headers["x-request-id"] || null,
      orderId: req.body?.orderId || null,
      shopId: req.body?.shopId || req.shop?._id || null,
      customerId: req.user?._id || null,
      paymentMode: req.body?.paymentMode || null,
      error: err?.message || String(err),
      stack: err?.stack || null,
    });

    res.status(400).json({
      success: false,
      message: err.message
    });

  } finally {
    session.endSession();
  }
};

/**
 * SHOP ORDERS
 */
exports.getOrders = async (req, res) => {
  const rawLimit = Number(req.query.limit);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, 100)
    : null;

  let query = createReadQuery(Order, {
    shopId: req.shop?._id || req.user?.shopId,
  })
    .populate("items.product", "name price")
    .populate("user", "name email phone")
    .sort({ createdAt: -1 });

  if (limit) {
    query = query.limit(limit);
  }

  const orders = await query;

  res.json({
    message: t('common.updated', req.lang),
    data: orders,
  });
};

exports.getMyOrders = async (req, res) => {
  const orders = await createReadQuery(Order, {
    customerId: req.user?._id,
  })
    .populate("items.product", "name price slug shopId")
    .sort({ createdAt: -1 });

  const data = await Promise.all(orders.map((order) => serializeCustomerOrder(order)));

  res.json({
    message: t("common.updated", req.lang),
    data,
  });
};

exports.getOrderById = async (req, res) => {
  const order = await createReadOneQuery(Order, { _id: req.params.orderId })
    .populate("items.product", "name price slug shopId");

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  const role = String(req.user?.role || "").toUpperCase();
  const isCustomerOwner = String(order.customerId || "") === String(req.user?._id || "");
  const isMerchantScoped = String(order.shopId || "") === String(req.user?.shopId || "");

  if (
    role !== "ADMIN" &&
    !(role === "CUSTOMER" && isCustomerOwner) &&
    !((role === "OWNER" || role === "STAFF") && isMerchantScoped)
  ) {
    return res.status(403).json({ message: "Forbidden" });
  }

  res.json({
    message: t("common.updated", req.lang),
    data: await serializeCustomerOrder(order),
  });
};

/**
 * ADMIN ALL ORDERS
 */
exports.getAllOrders = async (req, res) => {

  const page = Number(req.query.page) || 0;
  const limit = Number(req.query.limit) || 10;

  const orders = await createReadQuery(Order, {})
    .skip(page * limit)
    .limit(limit)
    .populate("user shop");

  const total = await Order.countDocuments();

  res.json({
    message: t('common.updated', req.lang),
    page,
    limit,
    total,
    data: orders,
  });
};

/**
 * STATUS UPDATE
 */
exports.updateOrderStatus = async (req, res) => {

  try {

    let order = null;
    if (req.body.status) {
      order = await transitionOrder({
        orderId: req.params.orderId,
        nextStatus: req.body.status,
      });
    }

    if (req.body.disputeStatus || req.body.adminNotes !== undefined || req.body.disputeReason) {
      const update = {};
      if (req.body.disputeStatus) update.disputeStatus = req.body.disputeStatus;
      if (req.body.adminNotes !== undefined) update.adminNotes = req.body.adminNotes;
      if (req.body.disputeReason) update.disputeReason = req.body.disputeReason;
      order = await Order.findByIdAndUpdate(req.params.orderId, update, { returnDocument: "after" });

      if (order) {
        await createAudit({
          action: "ORDER_DISPUTE_UPDATE",
          performedBy: req.user?._id || null,
          targetType: "Order",
          targetId: order._id,
          req,
          meta: {
            disputeStatus: order.disputeStatus,
            disputeReason: order.disputeReason,
            adminNotes: order.adminNotes,
          },
        });
      }
    }

    res.json({
      message: t('common.updated', req.lang),
      order,
    });

  } catch (err) {

    res.status(400).json({
      message: err.message,
    });

  }
};


