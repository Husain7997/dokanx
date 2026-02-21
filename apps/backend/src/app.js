// src/app.js
const express = require('express');
const cors = require('cors');
const middlewares = require('./middlewares');
const routes = require('./routes');
const errorHandler = require('./utils/errorHandler');
const healthRoutes = require('./routes/health.routes');

const app = express();

// core middlewares
app.use(cors());
app.use(express.json());
app.use('/', healthRoutes);
app.use(
 require("./infrastructure/rateLimit/rateLimiter")
);
app.use(
 require("./infrastructure/apiGateway/gateway.middleware")
);


// app.use(middlewares.protect);

// health check (Postman test)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'DokanX Backend',
    timestamp: new Date().toISOString(),
  });
});

// routes
app.use('/api', routes);

// global error handler
app.use(errorHandler);

module.exports = app;
