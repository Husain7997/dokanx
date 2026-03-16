const { randomToken } = require("../../../utils/crypto.util");

exports.createPayment = async ({ amount, currency, orderId }) => {
  return {
    provider: "stripe",
    providerPaymentId: `stripe_${randomToken(10)}`,
    paymentUrl: `https://dashboard.stripe.com/payments/${orderId}`,
    amount,
    currency,
  };
};

exports.verifyWebhook = async (_payload, _signature) => {
  return true;
};
