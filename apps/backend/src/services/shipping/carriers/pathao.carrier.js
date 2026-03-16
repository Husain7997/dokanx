const { randomToken } = require("../../../utils/crypto.util");

exports.createShipment = async ({ orderId }) => {
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
