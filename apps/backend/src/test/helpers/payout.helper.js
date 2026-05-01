const mongoose = require("mongoose");
const Payout = require("../../models/payout.model");

function randomSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function createPayoutRequest(amount = 1000, shopId = new mongoose.Types.ObjectId()) {
  return Payout.create({
    shopId,
    amount,
    requestedBy: new mongoose.Types.ObjectId(),
    status: "REQUESTED",
    type: "MANUAL",
    reference: `REQ_${shopId}_${randomSuffix()}`,
  });
}

async function createFailedPayout(amount = 1000, shopId = new mongoose.Types.ObjectId()) {
  return Payout.create({
    shopId,
    amount,
    requestedBy: new mongoose.Types.ObjectId(),
    status: "FAILED",
    type: "MANUAL",
    reference: `FAIL_${shopId}_${randomSuffix()}`,
  });
}

module.exports = {
  createPayoutRequest,
  createFailedPayout,
};
