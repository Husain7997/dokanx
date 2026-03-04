const PaymentLock =
  require("../../models/paymentLock.model");

exports.acquirePaymentLock = async (key) => {
  try {
    await PaymentLock.create({
      key,
      expiresAt: new Date(Date.now() + 60000),
    });
  } catch {
    throw new Error("Payment already processing");
  }
};

exports.releasePaymentLock = async (key) => {
  await PaymentLock.deleteOne({ key });
};