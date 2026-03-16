const ApiKey = require("../models/apiKey.model");
const Developer = require("../models/developer.model");
const { hashSecret } = require("../utils/crypto.util");

async function apiKeyAuth(req, res, next) {
  try {
    const rawKey = req.headers["x-api-key"];
    if (!rawKey) {
      return res.status(401).json({ message: "API key required" });
    }

    const keyHash = hashSecret(rawKey);
    const apiKey = await ApiKey.findOne({ keyHash, revokedAt: null });
    if (!apiKey) {
      return res.status(401).json({ message: "Invalid API key" });
    }

    if (apiKey.usageRemaining !== null) {
      if (apiKey.usageRemaining <= 0) {
        return res.status(429).json({ message: "API key usage limit reached" });
      }
      apiKey.usageRemaining -= 1;
      apiKey.lastUsedAt = new Date();
      await apiKey.save();
    } else {
      apiKey.lastUsedAt = new Date();
      await apiKey.save();
    }

    const developer = await Developer.findById(apiKey.developerId);
    req.apiKey = apiKey;
    req.developer = developer;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requirePermissions(...scopes) {
  return (req, res, next) => {
    const permissions = req.apiKey?.permissions || [];
    const allowed = scopes.every((scope) => permissions.includes(scope));
    if (!allowed) {
      return res.status(403).json({ message: "Missing required scopes" });
    }
    return next();
  };
}

module.exports = { apiKeyAuth, requirePermissions };
