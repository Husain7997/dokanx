const { dispatch } = require("../modules/webhook-engine/webhook-engine.service");

async function dispatchWebhooks(event, payload) {
  await dispatch(event, payload);
}

module.exports = {
  dispatchWebhooks,
};
