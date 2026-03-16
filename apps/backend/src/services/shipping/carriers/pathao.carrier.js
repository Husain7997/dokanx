const { randomToken } = require("../../../utils/crypto.util");

exports.createShipment = async ({ orderId }) => {
  const apiKey = process.env.PATHAO_API_KEY || "";
  if (process.env.NODE_ENV === "production" && !apiKey) {
    throw new Error("Pathao API key missing");
  }
  return {
    carrier: "pathao",
    trackingNumber: `pathao_${randomToken(8)}`,
    labelUrl: `https://sandbox.pathao.com/labels/${orderId}`,
  };
};

exports.parseWebhook = async (payload) => {
  return {
    trackingNumber: payload.trackingNumber,
    status: payload.status,
    message: payload.message || "",
  };
};

exports.verifyWebhook = async (payload, signature) => {
  const crypto = require("crypto");
  const secret = process.env.PATHAO_WEBHOOK_SECRET || "";
  if (!secret) return process.env.NODE_ENV !== "production";
  const expected = crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
  return expected === signature;
};
