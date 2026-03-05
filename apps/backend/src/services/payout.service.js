// src/services/payout.service.js

const Payout =
  require("../models/payout.model");

const crypto = require("crypto");

const {eventBus} = require("@/core/infrastructure");
const {
  executeFinancial
} = require("@/services/financialCommand.service");

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

  await executeFinancial({
    shopId,
    amount: Math.abs(payout.amount || 0),
    idempotencyKey: payout.reference,
    reason: "wallet_debit"
  });

  payout.status = "SUCCESS";
  payout.processedAt = new Date();

  await payout.save();

  eventBus.emit("PAYOUT_COMPLETED", {
    payoutId: payout._id,
  });

  return payout;
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
    status: "PENDING",
    type: "MANUAL",
    reference:
      `REQ_${shopId}_${Date.now()}`,
  });

}

async function createAdminPayout({
  shopId,
  amount,
  adminId
}) {
  return Payout.create({
    shopId,
    amount,
    requestedBy: adminId,
    status: "PENDING",
    type: "MANUAL",
    reference: `ADMIN_REQ_${shopId}_${Date.now()}`
  });
}

async function approvePayout(id, adminId) {
  const payout = await Payout.findById(id);
  if (!payout) throw new Error("Payout not found");
  if (payout.status === "SUCCESS") return payout;

  payout.approvedBy = adminId;
  payout.status = "PROCESSING";
  await payout.save();
  return payout;
}

async function executePayout(id, idempotencyKey) {
  const payout = await Payout.findById(id);
  if (!payout) throw new Error("Payout not found");
  if (payout.status === "SUCCESS") return payout;

  await executeFinancial({
    shopId: payout.shopId,
    amount: Math.abs(payout.amount || 0),
    idempotencyKey: idempotencyKey || payout.reference || payout._id,
    reason: "wallet_debit"
  });

  payout.status = "SUCCESS";
  payout.processedAt = new Date();
  await payout.save();

  return payout;
}

async function triggerPayout(settlementId) {
  // Backward-compatible hook used by admin settlement controllers.
  return processPayout({ shopId: settlementId });
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
  retryFailedPayout
};
