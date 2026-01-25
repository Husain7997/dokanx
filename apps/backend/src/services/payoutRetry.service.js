const Payout = require("../models/payout.model");
const PayoutRetry = require("../models/PayoutRetry");
const Wallet = require("../models/wallet.model");

exports.retryPayout = async (payoutId) => {
  const payout = await Payout.findById(payoutId);
  if (!payout || payout.status === "SUCCESS") return;

  let retry = await PayoutRetry.findOne({ payoutId });
  if (!retry) {
    retry = await PayoutRetry.create({ payoutId });
  }

  if (retry.attempts >= 5) {
    retry.status = "FAILED";
    await retry.save();
    return;
  }

  try {
    // Call external payout API here
    // await bankTransfer(payout)

    payout.status = "SUCCESS";
    await payout.save();

    retry.status = "SUCCESS";
    await retry.save();
  } catch (err) {
    retry.attempts += 1;
    retry.lastError = err.message;
    retry.updatedAt = new Date();
    await retry.save();
    throw err;
  }
};
