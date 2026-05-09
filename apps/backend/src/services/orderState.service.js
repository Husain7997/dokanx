const mongoose = require("mongoose");
const Order = require("../models/order.model");
const Product = require("../models/product.model");

const eventBus = require("@/infrastructure/events/eventBus");;
const EVENTS = require("../domain/events");

const {
  canTransition,
} = require("../domain/orderStateMachine");
const { resolveShopId } = require("../utils/order-normalization.util");
const { createLedgerEntry } = require("./ledger.service");
const agentService = require("../modules/agent/agent.service");

function normalizeOrderStatus(status) {
  const normalized = String(status || "").trim().toUpperCase();
  return normalized === "ACCEPTED" ? "CONFIRMED" : normalized;
}

exports.transitionOrder =
  async ({ orderId, nextStatus }) => {

  const session =
    await mongoose.startSession();

  session.startTransaction();

  try {

    const order =
      await Order.findById(orderId)
        .session(session);

    if (!order)
      throw new Error("Order not found");

    const normalizedNextStatus = normalizeOrderStatus(nextStatus);

    if (
      !canTransition(order.status, normalizedNextStatus)
    ) {
      throw new Error(
        `Illegal transition ${order.status} → ${normalizedNextStatus}`
      );
    }

    order.status = normalizedNextStatus;

    await order.save({ session });

    await session.commitTransaction();

    /**
     * DOMAIN EVENTS ONLY
     */

    if (normalizedNextStatus === "CONFIRMED") {
      eventBus.emit(EVENTS.ORDER_CONFIRMED, {
        orderId: order._id,
        shopId: resolveShopId(order),
        items: order.items,
      });
    }

    if (normalizedNextStatus === "CANCELLED") {
      eventBus.emit(EVENTS.ORDER_CANCELLED, {
        orderId: order._id,
        shopId: resolveShopId(order),
        items: order.items,
      });
    }

    if (normalizedNextStatus === "SHIPPED") {
      eventBus.emit("order.shipped", {
        orderId: order._id,
        shopId: resolveShopId(order),
        items: order.items,
      });
    }

    if (normalizedNextStatus === "DELIVERED") {
      await postDeliveredOrderFinance(order);
      eventBus.emit("order.delivered", {
        orderId: order._id,
        shopId: resolveShopId(order),
        items: order.items,
      });
    }

    return order;

  } catch (err) {

    await session.abortTransaction();
    throw err;

  } finally {
    session.endSession();
  }
};

async function calculateOrderProfit(order) {
  const productIds = (order.items || []).map((item) => item.product).filter(Boolean);
  if (!productIds.length) return { grossProfit: 0, totalCost: 0, items: [] };
  const products = await Product.find({ _id: { $in: productIds } }).select("costPrice").lean();
  const costByProduct = new Map(products.map((product) => [String(product._id), Number(product.costPrice || 0)]));
  let totalCost = 0;
  const items = (order.items || []).map((item) => {
    const costPrice = costByProduct.get(String(item.product)) || 0;
    const quantity = Number(item.quantity || 0);
    const lineCost = costPrice * quantity;
    const lineRevenue = Number(item.price || 0) * quantity;
    totalCost += lineCost;
    return {
      productId: item.product,
      quantity,
      costPrice,
      sellingPrice: Number(item.price || 0),
      profit: Number((lineRevenue - lineCost).toFixed(2)),
    };
  });
  return {
    grossProfit: Number((Number(order.totalAmount || 0) - totalCost).toFixed(2)),
    totalCost: Number(totalCost.toFixed(2)),
    items,
  };
}

async function postDeliveredOrderFinance(order) {
  const merchantId = resolveShopId(order);
  if (!merchantId) return;
  const profit = await calculateOrderProfit(order);
  order.metadata = {
    ...(order.metadata || {}),
    finance: {
      ...(order.metadata?.finance || {}),
      profit,
      postedAt: new Date(),
    },
  };
  await order.save();

  await createLedgerEntry({
    merchantId,
    type: "SALE",
    direction: "CREDIT",
    amount: Number(order.totalAmount || 0),
    referenceId: order._id,
    referenceType: "ORDER",
    status: "CONFIRMED",
    meta: {
      source: "order_delivered",
      profit,
      paymentMode: order.paymentMode,
    },
  });

  const commission = await agentService.handleSuccessfulShopPayment({
    shopId: merchantId,
    amount: Number(order.totalAmount || 0),
    orderId: order._id,
  });
  if (commission?.amount > 0) {
    await createLedgerEntry({
      merchantId,
      type: "COMMISSION",
      direction: "DEBIT",
      amount: Number(commission.amount || 0),
      referenceId: order._id,
      referenceType: "COMMISSION",
      status: "CONFIRMED",
      meta: {
        source: "agent_commission",
        rate: commission.rate || null,
      },
    });
  }
}
