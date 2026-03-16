const bkash = require("./providers/bkash.provider");
const nagad = require("./providers/nagad.provider");
const stripe = require("./providers/stripe.provider");
const ProviderCredential = require("../../models/providerCredential.model");
const { decryptSecret } = require("../../utils/crypto.util");

const providers = {
  bkash,
  nagad,
  stripe,
};

function resolveProvider(name) {
  const key = String(name || "").toLowerCase();
  return providers[key] || providers.bkash;
}

async function loadCredentials(provider) {
  const record = await ProviderCredential.findOne({ provider });
  if (!record) return null;
  const secret = decryptSecret(record.secretCipher, record.secretIv);
  return {
    publicData: record.publicData || {},
    secret,
    status: record.status,
  };
}

async function createPayment({ provider, amount, currency, orderId }) {
  const adapter = resolveProvider(provider);
  const credentials = await loadCredentials(provider);
  return adapter.createPayment({ amount, currency, orderId, credentials });
}

async function verifyWebhook(provider, payload, signature) {
  const adapter = resolveProvider(provider);
  const credentials = await loadCredentials(provider);
  return adapter.verifyWebhook(payload, signature, credentials);
}

module.exports = {
  createPayment,
  verifyWebhook,
};
