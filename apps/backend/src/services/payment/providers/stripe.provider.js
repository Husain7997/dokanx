const crypto = require("crypto");
const { randomToken } = require("../../../utils/crypto.util");

exports.createPayment = async ({ amount, currency, orderId, credentials }) => {
  const secretKey = credentials?.secret || process.env.STRIPE_SECRET_KEY || "";
  if (process.env.NODE_ENV === "production" && !secretKey) {
    throw new Error("Stripe secret key missing");
  }
  return {
    provider: "stripe",
    providerPaymentId: `stripe_${randomToken(10)}`,
    paymentUrl: `https://dashboard.stripe.com/payments/${orderId}`,
    amount,
    currency,
  };
};

exports.verifyWebhook = async (payload, signature, credentials) => {
  const secret = credentials?.secret || process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!secret) return process.env.NODE_ENV !== "production";
  const expected = crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
  return expected === signature;
};
