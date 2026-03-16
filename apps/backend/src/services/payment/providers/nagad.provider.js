const crypto = require("crypto");
const { randomToken } = require("../../../utils/crypto.util");

exports.createPayment = async ({ amount, currency, orderId }) => {
  const merchantId = process.env.NAGAD_MERCHANT_ID || "";
  const merchantKey = process.env.NAGAD_MERCHANT_KEY || "";
  if (process.env.NODE_ENV === "production" && (!merchantId || !merchantKey)) {
    throw new Error("Nagad credentials missing");
  }
  return {
    provider: "nagad",
    providerPaymentId: `nagad_${randomToken(10)}`,
    paymentUrl: `https://sandbox.nagad.com/pay/${orderId}`,
    amount,
    currency,
  };
};

exports.verifyWebhook = async (payload, signature) => {
  const secret = process.env.NAGAD_WEBHOOK_SECRET || "";
  if (!secret) return process.env.NODE_ENV !== "production";
  const expected = crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
  return expected === signature;
};
