const Payout = require("../models/payout.model");
const Settlement = require("../models/settlement.model");
const crypto = require("crypto");

const { eventBus } = require("@/core/infrastructure");
const { executeFinancial } = require("@/services/financialCommand.service");

const EXECUTABLE_STATUSES = ["PENDING", "PROCESSING", "FAILED"];

function toPositiveAmount(amount) {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Payout amount must be greater than 0");
  }
  return Math.abs(parsed);
}

async function findExecutablePayout({ shopId, payoutId = null }) {
  if (payoutId) {
    return Payout.findById(payoutId);
  }

  const query = Payout.findOne({
    shopId,
    status: { $in: EXECUTABLE_STATUSES },
  });

  if (query && typeof query.sort === "function") {
    return query.sort({ createdAt: 1 });
  }

  return query;
}

async function markSettlementPayoutReference({ payout, settlementId = null }) {
  if (!settlementId) return;

  await Settlement.updateOne(
    { _id: settlementId, shopId: payout.shopId },
    {
      $set: {
        payoutRef: payout.reference,
        status: "COMPLETED",
        processedAt: new Date(),
      },
    }
  );
}

async function processPayout({ shopId, payoutId = null, settlementId = null, idempotencyKey = null }) {
  const payout = await findExecutablePayout({ shopId, payoutId });

  if (!payout) {
    throw new Error("No payout request found");
  }

  if (payout.status === "SUCCESS") {
    return payout;
  }

  const amount = toPositiveAmount(payout.amount);
  payout.status = "PROCESSING";
  await payout.save();

  await executeFinancial({
    shopId,
    amount,
    idempotencyKey: idempotencyKey || payout.idempotencyKey || payout.reference,
    reason: "wallet_debit",
  });

  payout.status = "SUCCESS";
  payout.processedAt = new Date();
  payout.executedAt = payout.processedAt;
  await payout.save();

  await markSettlementPayoutReference({ payout, settlementId });

  eventBus.emit("PAYOUT_COMPLETED", {
    payoutId: payout._id,
    shopId: payout.shopId,
    amount,
  });

  return payout;
}

async function createShopPayoutRequest({
  shopId,
  amount,
  userId,
}) {
  const normalizedAmount = toPositiveAmount(amount);

  return Payout.create({
    shopId,
    amount: normalizedAmount,
    requestedBy: userId,
    status: "PENDING",
    type: "MANUAL",
    reference: `REQ_${shopId}_${Date.now()}`,
    idempotencyKey: `REQ_${shopId}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
  });
}

async function createAdminPayout({
  shopId,
  amount,
  adminId,
}) {
  const normalizedAmount = toPositiveAmount(amount);

  return Payout.create({
    shopId,
    amount: normalizedAmount,
    requestedBy: adminId,
    status: "PENDING",
    type: "MANUAL",
    reference: `ADMIN_REQ_${shopId}_${Date.now()}`,
    idempotencyKey: `ADMIN_REQ_${shopId}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
  });
}

async function approvePayout(id, adminId) {
  const payout = await Payout.findById(id);
  if (!payout) throw new Error("Payout not found");
  if (payout.status === "SUCCESS") return payout;

  toPositiveAmount(payout.amount);
  payout.approvedBy = adminId;
  payout.status = "PROCESSING";
  await payout.save();
  return payout;
}

async function executePayout(id, idempotencyKey) {
  const payout = await Payout.findById(id);
  if (!payout) throw new Error("Payout not found");
  if (payout.status === "SUCCESS") return payout;

  return processPayout({
    shopId: payout.shopId,
    payoutId: payout._id,
    idempotencyKey: idempotencyKey || payout.reference || payout._id,
  });
}

async function triggerPayout(target, options = {}) {
  if (target && typeof target === "object" && target.settlementId) {
    const settlement = await Settlement.findById(target.settlementId);
    if (!settlement) {
      throw new Error("Settlement not found");
    }

    return processPayout({
      shopId: settlement.shopId,
      settlementId: settlement._id,
      payoutId: options.payoutId || null,
      idempotencyKey: options.idempotencyKey || settlement.idempotencyKey || settlement._id,
    });
  }

  return processPayout({
    shopId: target,
    payoutId: options.payoutId || null,
    settlementId: options.settlementId || null,
    idempotencyKey: options.idempotencyKey || null,
  });
}

async function retryFailedPayout(shopId) {
  return processPayout({ shopId });
}

module.exports = {
  processPayout,
  createShopPayoutRequest,
  createAdminPayout,
  approvePayout,
  executePayout,
  triggerPayout,
  retryFailedPayout,
};
