const express = require('express');

const rateLimit =
  require('./rateLimit.middleware');

const requestContext =
  require('./requestContext.middleware');

const gatewayMiddleware =
  require('./gateway.middleware');

const languageMiddleware =
  require('../middlewares/language.middleware');

const routes =
  require('./gateway.routes');

  const errorHandler =
  require('../middlewares/errorHandler.middleware');



function createGateway() {

  const app = express();

  app.use(express.json());

  app.use(requestContext);

  app.use(languageMiddleware);

  app.use(rateLimit);

  app.use(gatewayMiddleware);

  app.use('/api', routes);
  
  app.use(errorHandler);

  return app;
}

module.exports = createGateway;