// src/app.js

const express = require("express");
const cors = require("cors");
const passport = require("passport");

const routes = require("./routes");
const healthRoutes = require("./routes/health.routes");

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

app.use(cors());
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf ? buf.toString("utf8") : "";
  },
}));

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

app.use("/", healthRoutes);

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
