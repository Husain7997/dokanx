const crypto = require("crypto");
const { randomToken } = require("../../../utils/crypto.util");

exports.createPayment = async ({ amount, currency, orderId, credentials }) => {
  const appKey = credentials?.publicData?.appKey || process.env.BKASH_APP_KEY || "";
  const appSecret = credentials?.secret || process.env.BKASH_APP_SECRET || "";
  if (process.env.NODE_ENV === "production" && (!appKey || !appSecret)) {
    throw new Error("bKash credentials missing");
  }
  return {
    provider: "bkash",
    providerPaymentId: `bkash_${randomToken(10)}`,
    paymentUrl: `https://sandbox.bkash.com/pay/${orderId}`,
    amount,
    currency,
  };
};

exports.verifyWebhook = async (payload, signature, credentials) => {
  const secret = credentials?.secret || process.env.BKASH_WEBHOOK_SECRET || "";
  if (!secret) return process.env.NODE_ENV !== "production";
  const expected = crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
  return expected === signature;
};
