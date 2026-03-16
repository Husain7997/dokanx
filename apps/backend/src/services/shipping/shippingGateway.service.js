const pathao = require("./carriers/pathao.carrier");
const paperfly = require("./carriers/paperfly.carrier");

const carriers = {
  pathao,
  paperfly,
};

function resolveCarrier(name) {
  const key = String(name || "").toLowerCase();
  return carriers[key] || carriers.pathao;
}

async function createShipment({ carrier, orderId }) {
  const adapter = resolveCarrier(carrier);
  return adapter.createShipment({ orderId });
}

async function parseWebhook(carrier, payload) {
  const adapter = resolveCarrier(carrier);
  return adapter.parseWebhook(payload);
}

module.exports = {
  createShipment,
  parseWebhook,
};
