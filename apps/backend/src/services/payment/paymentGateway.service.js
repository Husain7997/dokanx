const bkash = require("./providers/bkash.provider");
const nagad = require("./providers/nagad.provider");
const stripe = require("./providers/stripe.provider");

const providers = {
  bkash,
  nagad,
  stripe,
};

function resolveProvider(name) {
  const key = String(name || "").toLowerCase();
  return providers[key] || providers.bkash;
}

async function createPayment({ provider, amount, currency, orderId }) {
  const adapter = resolveProvider(provider);
  return adapter.createPayment({ amount, currency, orderId });
}

async function verifyWebhook(provider, payload, signature) {
  const adapter = resolveProvider(provider);
  return adapter.verifyWebhook(payload, signature);
}

module.exports = {
  createPayment,
  verifyWebhook,
};
