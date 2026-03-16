const { randomToken } = require("../../../utils/crypto.util");

exports.createPayment = async ({ amount, currency, orderId }) => {
  return {
    provider: "nagad",
    providerPaymentId: `nagad_${randomToken(10)}`,
    paymentUrl: `https://sandbox.nagad.com/pay/${orderId}`,
    amount,
    currency,
  };
};

exports.verifyWebhook = async (_payload, _signature) => {
  return true;
};
