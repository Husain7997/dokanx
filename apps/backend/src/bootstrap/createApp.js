const express = require("express");
const cors = require("cors");
const passport = require("passport");

const routes = require("../routes");
const healthRoutes = require("../routes/health.routes");
const errorHandler = require("../middlewares/errorHandler.middleware");
const requestContext = require("../middlewares/requestContext");
const languageMiddleware = require("../middlewares/language.middleware");
const tenantResolution = require("../middlewares/tenantResolution.middleware");
const panicMode = require("../middlewares/panicMode.middleware");
const httpLogger = require("../middlewares/httpLogger");
const rateLimiter = require("../infrastructure/rateLimit/rateLimiter");
const gateway = require("../infrastructure/apiGateway/gateway.middleware");
const openApiDocs = require("../docs/openapi/swagger");
const { resolveLanguage } = require("@/core/language");

require("@/core/transaction/transaction.audit");

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use(tenantResolution.resolveTenant);
  app.use(requestContext);
  app.use(languageMiddleware);
  app.use(httpLogger);
  app.use(passport.initialize());
  app.use("/docs", openApiDocs);

  app.use((req, _res, next) => {
    req.lang = resolveLanguage(req);
    next();
  });

  app.use("/", healthRoutes);
  app.use(rateLimiter);
  app.use(gateway);
  app.use(panicMode.enforcePanicMode);
  app.use("/api", routes);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
};
