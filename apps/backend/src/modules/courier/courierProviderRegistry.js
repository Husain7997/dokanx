const PathaoProvider = require("./providers/pathao.provider");
const RedxProvider = require("./providers/redx.provider");
const SteadfastProvider = require("./providers/steadfast.provider");
const ECourierProvider = require("./providers/ecourier.provider");

const providers = {
  PATHAO: new PathaoProvider(),
  REDX: new RedxProvider(),
  STEADFAST: new SteadfastProvider(),
  ECOURIER: new ECourierProvider(),
};

function getProvider(name = "") {
  return providers[String(name || "").trim().toUpperCase()] || null;
}

module.exports = {
  getProvider,
  listProviders() {
    return Object.values(providers).map(provider => ({
      name: provider.name,
      configured: provider.isConfigured(),
      config: provider.getConfig(),
    }));
  },
};
