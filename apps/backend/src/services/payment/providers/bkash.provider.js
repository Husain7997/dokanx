const { randomToken } = require("../../../utils/crypto.util");

exports.createPayment = async ({ amount, currency, orderId }) => {
  return {
    provider: "bkash",
    providerPaymentId: `bkash_${randomToken(10)}`,
    paymentUrl: `https://sandbox.bkash.com/pay/${orderId}`,
    amount,
    currency,
  };
};

exports.verifyWebhook = async (_payload, _signature) => {
  return true;
};
