// src/services/payout.service.js

const Payout =
  require("../models/payout.model");

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
      { upsert: true, new: true }
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
    status: "REQUESTED",
    type: "MANUAL",
    reference:
      `REQ_${shopId}_${Date.now()}`,
  });

}

module.exports = {
  processPayout,
  createShopPayoutRequest,
};