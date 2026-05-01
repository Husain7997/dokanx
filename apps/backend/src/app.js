// src/app.js

const express = require("express");
const passport = require("passport");

const routes = require("./routes");
const healthRoutes = require("./routes/health.routes");
const adminMetricsController = require("./controllers/admin.metrics.controller");

const errorHandler =
  require("./middlewares/errorHandler.middleware");

const rateLimiter =
  require("./infrastructure/rateLimit/rateLimiter");

const gateway =
  require("./infrastructure/apiGateway/gateway.middleware");

const requestContext =
  require("./middlewares/requestContext");
const dbAvailability =
  require("./middlewares/dbAvailability.middleware");
const tenantResolver =
  require("./middlewares/tenant.middleware");
const detectTrafficSource =
  require("./modules/traffic-engine/detectTrafficSource.middleware");

const languageMiddleware =
  require("./middlewares/language.middleware");

const httpLogger =
  require("./middlewares/httpLogger");
const {
  corsMiddleware,
  parseCookies,
  enforceHttps,
  securityHeaders,
  sanitizeInput,
} = require("./middlewares/security.middleware");
const ipBlockMiddleware = require("./middlewares/ipBlock.middleware");
const securityTelemetry = require("./middlewares/securityTelemetry.middleware");

require("@/core/transaction/transaction.audit");

const AutonomousEngine =
  require("./core/ai/autonomous.engine");

const { logger } =
  require("@/core/infrastructure");

  const { resolveLanguage } = require("@/core/language");


/*
|--------------------------------------------------------------------------
| APP INIT
|--------------------------------------------------------------------------
*/

const app = express();

/*
|--------------------------------------------------------------------------
| GLOBAL MIDDLEWARE
|--------------------------------------------------------------------------
*/

app.set("trust proxy", 1);
app.use(corsMiddleware);
app.use(parseCookies);
app.use(enforceHttps);
app.use(securityHeaders);
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf ? buf.toString("utf8") : "";
  },
  limit: process.env.JSON_BODY_LIMIT || "1mb",
}));
app.use(express.urlencoded({ extended: false, limit: process.env.JSON_BODY_LIMIT || "1mb" }));
app.use(sanitizeInput);
app.use(ipBlockMiddleware);
app.use(securityTelemetry);

app.use(requestContext);
app.use(languageMiddleware);
app.use(httpLogger);
app.use(tenantResolver);
app.use(detectTrafficSource);

app.use(passport.initialize());

app.use((req, res, next) => {
  req.lang = resolveLanguage(req);
  next();
});

/*
|--------------------------------------------------------------------------
| HEALTH
|--------------------------------------------------------------------------
*/

// Keep both legacy and infrastructure-friendly probe paths alive.
app.use("/", healthRoutes);
app.use("/health", healthRoutes);
app.get("/metrics", adminMetricsController.metrics);

/*
|--------------------------------------------------------------------------
| SECURITY
|--------------------------------------------------------------------------
*/

app.use(dbAvailability);
app.use(rateLimiter);
app.use(gateway);

/*
|--------------------------------------------------------------------------
| ROUTES
|--------------------------------------------------------------------------
*/

app.use("/api", routes);

/*
|--------------------------------------------------------------------------
| ERROR
|--------------------------------------------------------------------------
*/

app.use(errorHandler);

/*
|--------------------------------------------------------------------------
| AUTONOMOUS ENGINE SAFE BOOT
|--------------------------------------------------------------------------
*/


module.exports = app;
