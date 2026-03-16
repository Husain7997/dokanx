const { randomToken } = require("../../../utils/crypto.util");

exports.createShipment = async ({ orderId }) => {
  return {
    carrier: "paperfly",
    trackingNumber: `paperfly_${randomToken(8)}`,
    labelUrl: `https://sandbox.paperfly.com/labels/${orderId}`,
  };
};

exports.parseWebhook = async (payload) => {
  return {
    trackingNumber: payload.trackingNumber,
    status: payload.status,
    message: payload.message || "",
  };
};
