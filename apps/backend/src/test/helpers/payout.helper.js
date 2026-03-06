const Payout = require("../../models/payout.model");
const User = require("../../models/user.model");
const Shop = require("../../models/shop.model");

async function ensureShopOwner() {
  const owner = await User.create({
    name: `Payout Owner ${Date.now()}`,
    email: `payout-owner-${Date.now()}@test.local`,
    password: "123456",
    role: "OWNER",
  });

  const shop = await Shop.create({
    name: `Payout Shop ${Date.now()}`,
    owner: owner._id,
  });

  return { owner, shop };
}

async function createPayoutRequest(amount = 1000) {
  const { owner, shop } = await ensureShopOwner();
  return Payout.create({
    shopId: shop._id,
    amount,
    requestedBy: owner._id,
    status: "PENDING",
    type: "MANUAL",
    reference: `REQ_${shop._id}_${Date.now()}`,
  });
}

async function createFailedPayout(amount = 1000) {
  const { owner, shop } = await ensureShopOwner();
  return Payout.create({
    shopId: shop._id,
    amount,
    requestedBy: owner._id,
    status: "FAILED",
    type: "MANUAL",
    reference: `FAILED_${shop._id}_${Date.now()}`,
  });
}

module.exports = {
  createPayoutRequest,
  createFailedPayout,
};
