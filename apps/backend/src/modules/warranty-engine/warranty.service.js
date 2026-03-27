const Order = require("../../models/order.model");
const Product = require("../../models/product.model");
const User = require("../../models/user.model");
const mongoose = require("mongoose");
const CreditSale = require("../credit-engine/creditSale.model");
const CreditAccount = require("../credit/credit.account.model");
const CreditLedger = require("../credit/credit.ledger.model");
const walletService = require("../../services/wallet.service");
const fraudService = require("../../services/fraud.service");
const WarrantyClaim = require("./warrantyClaim.model");
const WarrantyServiceTicket = require("./serviceTicket.model");

function addDays(date, durationDays) {
  const result = new Date(date);
  result.setDate(result.getDate() + Number(durationDays || 0));
  return result;
}

function getRole(user) {
  return String(user?.role || "").toUpperCase();
}

function normalizeEvidence(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      return {
        imageUrl: item.imageUrl ? String(item.imageUrl) : null,
        note: item.note ? String(item.note) : "",
      };
    })
    .filter(Boolean);
}

async function resolveCustomer(customerId) {
  const lookup = [{ globalCustomerId: customerId }];
  if (mongoose.Types.ObjectId.isValid(customerId)) {
    lookup.push({ _id: customerId });
  }

  const customer = await User.findOne({
    $or: lookup,
  })
    .select("_id globalCustomerId name email")
    .lean();
  if (!customer) throw new Error("Customer not found");
  return customer;
}

function assertCustomerAccess(requestUser, globalCustomerId) {
  const role = getRole(requestUser);
  if (role === "ADMIN") return;
  if (role === "CUSTOMER" && requestUser.globalCustomerId === globalCustomerId) return;
  const error = new Error("Forbidden");
  error.statusCode = 403;
  throw error;
}

function assertShopAccess(requestUser, shopId) {
  const role = getRole(requestUser);
  if (role === "ADMIN") return;
  if ((role === "OWNER" || role === "STAFF") && String(requestUser.shopId || "") === String(shopId || "")) return;
  const error = new Error("Forbidden");
  error.statusCode = 403;
  throw error;
}

function resolveProtectionSnapshot(order, productId, type) {
  const key = type === "guarantee" ? "guaranteeSnapshot" : "warrantySnapshot";
  return (order[key] || []).find((item) => String(item.productId || "") === String(productId || "")) || null;
}

function extractOrderItem(order, productId) {
  return (order.items || []).find((item) => String(item.product || "") === String(productId || "")) || null;
}

async function evaluateClaimFraud({ orderId, productId, customerId, shopId, type }) {
  const [sameProductClaims, openClaims, recentClaims] = await Promise.all([
    WarrantyClaim.countDocuments({ orderId, productId, type }),
    WarrantyClaim.countDocuments({
      customerId,
      status: { $in: ["pending", "approved"] },
    }),
    WarrantyClaim.countDocuments({
      customerId,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    }),
  ]);

  const flags = [];
  if (sameProductClaims >= 1) flags.push("multiple_claims_same_product");
  if (openClaims >= 3) flags.push("too_many_open_claims");
  if (recentClaims >= 5) flags.push("high_claim_velocity");

  if (flags.length && typeof fraudService.evaluateWarrantyClaim === "function") {
    await fraudService.evaluateWarrantyClaim({
      orderId,
      productId,
      customerId,
      shopId,
      flags,
      source: "warranty_claim_created",
    });
  }

  return flags;
}

async function createClaim({ orderId, productId, customerId, type, reason, evidence = [] }, requestUser) {
  const claimType = String(type || "").toLowerCase();
  if (!["warranty", "guarantee"].includes(claimType)) {
    throw new Error("Claim type must be warranty or guarantee");
  }

  const customer = await resolveCustomer(customerId);
  assertCustomerAccess(requestUser, customer.globalCustomerId);

  const order = await Order.findById(orderId).lean();
  if (!order) throw new Error("Order not found");
  if (String(order.customerId || "") !== String(customer._id || "")) {
    const error = new Error("Forbidden");
    error.statusCode = 403;
    throw error;
  }

  const orderItem = extractOrderItem(order, productId);
  if (!orderItem) throw new Error("Product does not belong to this order");

  const product = await Product.findById(productId).select("shopId name").lean();
  if (!product) throw new Error("Product not found");
  if (String(product.shopId || "") !== String(order.shopId || "")) {
    throw new Error("Product does not match order shop");
  }

  const protectionSnapshot = resolveProtectionSnapshot(order, productId, claimType);
  if (!protectionSnapshot?.enabled) {
    throw new Error(`${claimType} not enabled for this product`);
  }
  if (protectionSnapshot.expiryDate && new Date(protectionSnapshot.expiryDate).getTime() < Date.now()) {
    throw new Error("Claim period expired");
  }

  const fraudFlags = await evaluateClaimFraud({
    orderId: order._id,
    productId,
    customerId: customer.globalCustomerId,
    shopId: order.shopId,
    type: claimType,
  });

  const claim = await WarrantyClaim.create({
    orderId: order._id,
    productId,
    customerId: customer.globalCustomerId,
    shopId: order.shopId,
    type: claimType,
    reason: String(reason || ""),
    evidence: normalizeEvidence(evidence),
    protectionSnapshot,
    fraudFlags,
  });

  return claim;
}

async function listCustomerClaims(customerId, requestUser) {
  const customer = await resolveCustomer(customerId);
  assertCustomerAccess(requestUser, customer.globalCustomerId);
  return WarrantyClaim.find({ customerId: customer.globalCustomerId }).sort({ createdAt: -1 }).lean();
}

async function listShopClaims(shopId, requestUser) {
  assertShopAccess(requestUser, shopId);
  return WarrantyClaim.find({ shopId }).sort({ createdAt: -1 }).lean();
}

async function listAllClaims(requestUser) {
  if (getRole(requestUser) !== "ADMIN") {
    const error = new Error("Forbidden");
    error.statusCode = 403;
    throw error;
  }
  return WarrantyClaim.find().sort({ createdAt: -1 }).limit(200).lean();
}

async function applyCreditRefund(order, claim, amount, referenceId, session = null) {
  const creditSale = order.creditSaleId ? await CreditSale.findById(order.creditSaleId).session(session) : null;
  if (!creditSale) return false;

  const refundableAmount = Math.min(Number(amount || 0), Number(creditSale.outstandingAmount || 0));
  creditSale.outstandingAmount = Number((creditSale.outstandingAmount - refundableAmount).toFixed(2));
  creditSale.amount = Math.max(0, Number(creditSale.amount || 0) - refundableAmount);
  creditSale.status = creditSale.outstandingAmount <= 0 ? "PAID" : creditSale.status;
  await creditSale.save(session ? { session } : undefined);

  await CreditAccount.findOneAndUpdate(
    { shopId: order.shopId, customerId: claim.customerId },
    { $inc: { outstandingBalance: -refundableAmount } },
    session ? { session } : undefined
  );

  await CreditLedger.create([{
    shop: order.shopId,
    shopId: order.shopId,
    customerId: claim.customerId,
    type: "ADJUSTMENT",
    amount: refundableAmount,
    status: "POSTED",
    reference: referenceId,
    meta: {
      source: "warranty_refund",
      claimId: claim._id,
      orderId: order._id,
      productId: claim.productId,
    },
  }], session ? { session } : undefined);

  return true;
}

async function createReplacementOrder(order, claim, session = null) {
  const originalItem = extractOrderItem(order, claim.productId);
  const product = await Product.findById(claim.productId).select("warranty guarantee").session(session).lean();
  const now = new Date();
  const replacementOrder = (await Order.create([{
    shop: order.shopId,
    shopId: order.shopId,
    customer: order.customerId,
    customerId: order.customerId,
    user: order.customerId,
    items: [
      {
        product: claim.productId,
        quantity: 1,
        price: 0,
      },
    ],
    totalAmount: 0,
    paymentStatus: "SUCCESS",
    status: "CONFIRMED",
    paymentMode: "ONLINE",
    trafficType: "direct",
    contact: order.contact || {},
    deliveryAddress: order.deliveryAddress || {},
    metadata: {
      internalReplacement: true,
      replacementForOrderId: order._id,
      replacementForClaimId: claim._id,
      originalQuantity: Number(originalItem?.quantity || 1),
    },
    warrantySnapshot: product?.warranty?.enabled
      ? [{
          productId: claim.productId,
          enabled: true,
          durationDays: Number(product.warranty.durationDays || 0),
          type: product.warranty.type || null,
          expiryDate: addDays(now, product.warranty.durationDays || 0),
        }]
      : [],
    guaranteeSnapshot: product?.guarantee?.enabled
      ? [{
          productId: claim.productId,
          enabled: true,
          durationDays: Number(product.guarantee.durationDays || 0),
          type: product.guarantee.type || null,
          expiryDate: addDays(now, product.guarantee.durationDays || 0),
        }]
      : [],
  }], session ? { session } : undefined))[0];
  return replacementOrder;
}

async function createRepairTicket(order, claim, note, session = null) {
  return WarrantyServiceTicket.create([{
    claimId: claim._id,
    orderId: order._id,
    productId: claim.productId,
    customerId: claim.customerId,
    shopId: claim.shopId,
    notes: String(note || claim.reason || ""),
  }], session ? { session } : undefined).then((rows) => rows[0]);
}

async function updateClaimStatus(claimId, payload, requestUser) {
  const claim = await WarrantyClaim.findById(claimId);
  if (!claim) throw new Error("Claim not found");

  const role = getRole(requestUser);
  if (role !== "ADMIN") {
    assertShopAccess(requestUser, claim.shopId);
  }

  const status = payload.status ? String(payload.status).toLowerCase() : claim.status;
  const resolutionType = payload.resolutionType ? String(payload.resolutionType).toLowerCase() : claim.resolutionType;
  const order = await Order.findById(claim.orderId);
  if (!order) throw new Error("Order not found");

  claim.status = status;
  claim.resolutionType = resolutionType || null;
  claim.decisionNote = payload.decisionNote ? String(payload.decisionNote) : claim.decisionNote;
  claim.reviewedBy = requestUser?._id || null;
  claim.reviewedAt = new Date();

  if (status === "resolved") {
    const originalItem = extractOrderItem(order, claim.productId);
    const resolutionAmount = Number(payload.amount || originalItem?.price || 0);
    const referenceId = `claim-${claim._id}-${resolutionType || "resolved"}`;

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      if (resolutionType === "refund") {
        const appliedToCredit = await applyCreditRefund(order, claim, resolutionAmount, referenceId, session);
        if (!appliedToCredit) {
          await walletService.addTransaction({
            shopId: claim.shopId,
            customerId: claim.customerId,
            type: "expense",
            walletType: "CASH",
            amount: resolutionAmount,
            referenceId,
            metadata: {
              source: "warranty_refund",
              claimId: claim._id,
              orderId: order._id,
              productId: claim.productId,
            },
            session,
          });
        }
        claim.refundReferenceId = referenceId;
      }

      if (resolutionType === "replacement") {
        const replacementOrder = await createReplacementOrder(order, claim, session);
        claim.internalReplacementOrderId = replacementOrder._id;
      }

      if (resolutionType === "repair") {
        const ticket = await createRepairTicket(order, claim, payload.decisionNote, session);
        claim.serviceTicketId = ticket._id;
      }

      await claim.save({ session });
      await session.commitTransaction();
      return claim;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  await claim.save();
  return claim;
}

async function getAnalytics() {
  const [summary] = await WarrantyClaim.aggregate([
    {
      $group: {
        _id: null,
        totalClaims: { $sum: 1 },
        pending: {
          $sum: {
            $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
          },
        },
        resolved: {
          $sum: {
            $cond: [{ $eq: ["$status", "resolved"] }, 1, 0],
          },
        },
        refunds: {
          $sum: {
            $cond: [{ $eq: ["$resolutionType", "refund"] }, 1, 0],
          },
        },
      },
    },
  ]);
  return summary || {
    totalClaims: 0,
    pending: 0,
    resolved: 0,
    refunds: 0,
  };
}

module.exports = {
  createClaim,
  getAnalytics,
  listAllClaims,
  listCustomerClaims,
  listShopClaims,
  updateClaimStatus,
};
