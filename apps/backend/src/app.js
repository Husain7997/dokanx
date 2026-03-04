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
app.use(express.json());

app.use(requestContext);
app.use(languageMiddleware);
app.use(httpLogger);

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