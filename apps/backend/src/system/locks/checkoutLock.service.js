const CheckoutLock = require("../../models/checkoutLock.model");

exports.acquireLock = async (key) => {
  try {
    await CheckoutLock.create({
      key,
      expiresAt: new Date(Date.now() + 60 * 1000),
    });
  } catch (err) {
    throw new Error("Checkout already in progress");
  }
};

exports.releaseLock = async (key) => {
  await CheckoutLock.deleteOne({ key });
};
