// src/services/payout.service.js

const Payout =
  require("../models/payout.model");
const Settlement = require("../models/settlement.model");

const crypto = require("crypto");

const {
  FinancialEngine,
  FinancialTypes,
} = require("@/core/financial");

const eventBus = require("@/infrastructure/events/eventBus");

async function processPayout({ shopId }) {

  const payout =
    await Payout.findOneAndUpdate(
      {
        shopId,
        status: { $ne: "SUCCESS" },
      },
      {
        $setOnInsert: {
          amount: 0,
          type: "AUTO",
          requestedBy: shopId,
          status: "PROCESSING",
          reference:
            `PAYOUT_${shopId}_${Date.now()}_${crypto
              .randomBytes(4)
              .toString("hex")}`,
        },
      },
      { upsert: true, returnDocument: "after" }
    );

  if (payout.status === "SUCCESS")
    return payout;

  await FinancialEngine.execute({
  shopId,
  amount: -Math.abs(payout.amount),
  type: "PAYOUT",
  referenceId: payout.reference,
  meta: {
    payoutId: payout._id,
  },
});

  payout.status = "SUCCESS";
  payout.processedAt = new Date();

  await payout.save();

  eventBus.emit("PAYOUT_COMPLETED", {
    payoutId: payout._id,
    shopId: payout.shopId,
    amount: payout.amount,
  });

  return payout;
}

async function approvePayout(payoutId, adminId) {
  const payout = await Payout.findById(payoutId);
  if (!payout) {
    const error = new Error("Payout not found");
    error.statusCode = 404;
    throw error;
  }

  if (['APPROVED', 'PROCESSING', 'SUCCESS'].includes(payout.status)) {
    const error = new Error('Payout already approved or processed');
    error.statusCode = 400;
    throw error;
  }

  payout.status = 'APPROVED';
  payout.approvedBy = adminId;
  payout.approvedAt = new Date();
  await payout.save();
  return payout;
}

async function executePayout(payoutId, idempotencyKey) {
  const payout = await Payout.findById(payoutId);
  if (!payout) {
    const error = new Error("Payout not found");
    error.statusCode = 404;
    throw error;
  }

  if (payout.status === 'SUCCESS') {
    return payout;
  }

  if (payout.status !== 'APPROVED' && payout.status !== 'FAILED' && payout.status !== 'PROCESSING') {
    const error = new Error('Payout is not ready for execution');
    error.statusCode = 400;
    throw error;
  }

  return processPayout({ shopId: payout.shopId });
}

async function createShopPayoutRequest({
  shopId,
  amount,
  userId,
}) {

  return Payout.create({
    shopId,
    amount,
    requestedBy: userId,
    status: "REQUESTED",
    type: "MANUAL",
    reference:
      `REQ_${shopId}_${Date.now()}`,
  });

}

async function createAdminPayout({ shopId, amount, adminId }) {
  return Payout.create({
    shopId,
    amount,
    requestedBy: adminId,
    status: "APPROVED",
    approvedBy: adminId,
    approvedAt: new Date(),
    type: "MANUAL",
    reference: `ADMIN_${shopId}_${Date.now()}`,
  });
}

async function retryPayout(payoutId) {
  const payout = await Payout.findById(payoutId);
  if (!payout) {
    const error = new Error("Payout not found");
    error.statusCode = 404;
    throw error;
  }

  payout.status = "PROCESSING";
  await payout.save();
  return payout;
}

async function triggerSettlementPayout(settlementId, options = {}) {
  const settlement = await Settlement.findById(settlementId);
  if (!settlement) {
    const error = new Error("Settlement not found");
    error.statusCode = 404;
    throw error;
  }

  const payout = await processPayout({ shopId: settlement.shopId });
  settlement.status = options.forceRetry ? "PROCESSING" : "COMPLETED";
  settlement.payoutRef = payout.reference || payout._id?.toString() || settlement.payoutRef;
  settlement.processedAt = new Date();
  await settlement.save();

  return {
    settlement,
    payout,
  };
}

module.exports = {
  processPayout,
  approvePayout,
  executePayout,
  retryPayout,
  createAdminPayout,
  createShopPayoutRequest,
  triggerSettlementPayout,
};
