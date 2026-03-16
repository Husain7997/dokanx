const pathao = require("./carriers/pathao.carrier");
const paperfly = require("./carriers/paperfly.carrier");
const ProviderCredential = require("../../models/providerCredential.model");
const { decryptSecret } = require("../../utils/crypto.util");

const carriers = {
  pathao,
  paperfly,
};

function resolveCarrier(name) {
  const key = String(name || "").toLowerCase();
  return carriers[key] || carriers.pathao;
}

async function loadCredentials(carrier) {
  const record = await ProviderCredential.findOne({ provider: carrier });
  if (!record) return null;
  const secret = decryptSecret(record.secretCipher, record.secretIv);
  return {
    publicData: record.publicData || {},
    secret,
    status: record.status,
  };
}

async function createShipment({ carrier, orderId }) {
  const adapter = resolveCarrier(carrier);
  const credentials = await loadCredentials(carrier);
  return adapter.createShipment({ orderId, credentials });
}

async function parseWebhook(carrier, payload) {
  const adapter = resolveCarrier(carrier);
  return adapter.parseWebhook(payload);
}

async function verifyWebhook(carrier, payload, signature) {
  const adapter = resolveCarrier(carrier);
  const credentials = await loadCredentials(carrier);
  if (!adapter.verifyWebhook) return true;
  return adapter.verifyWebhook(payload, signature, credentials);
}

module.exports = {
  createShipment,
  parseWebhook,
  verifyWebhook,
};
