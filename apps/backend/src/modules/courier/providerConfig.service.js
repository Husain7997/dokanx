function asUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function envKey(prefix, suffix) {
  return `${asUpper(prefix)}_${asUpper(suffix)}`;
}

function getProviderConfig(prefix) {
  const upperPrefix = asUpper(prefix);
  return {
    prefix: upperPrefix,
    baseUrl: process.env[envKey(upperPrefix, "BASE_URL")] || "",
    apiKey: process.env[envKey(upperPrefix, "API_KEY")] || "",
    apiSecret: process.env[envKey(upperPrefix, "API_SECRET")] || "",
    clientId: process.env[envKey(upperPrefix, "CLIENT_ID")] || "",
    clientSecret: process.env[envKey(upperPrefix, "CLIENT_SECRET")] || "",
    storeId: process.env[envKey(upperPrefix, "STORE_ID")] || "",
    sandbox: String(process.env[envKey(upperPrefix, "SANDBOX")] || "true") === "true",
  };
}

function isConfigured(config = {}) {
  return Boolean(config.baseUrl && (config.apiKey || config.clientId));
}

module.exports = {
  getProviderConfig,
  isConfigured,
};
