const { buildPlatformContext, logGatewayUsage } = require("./api-gateway.service");

async function publicApiGateway(req, res, next) {
  try {
    req.platformRequestStartedAt = Date.now();
    req.platformContext = await buildPlatformContext(req);
    res.on("finish", () => {
      void logGatewayUsage(req, res.statusCode);
    });
    return next();
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Public API gateway error" });
  }
}

module.exports = {
  publicApiGateway,
};
