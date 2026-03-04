/**
 * Global Gateway Middleware
 */

module.exports = function gatewayMiddleware(req, res, next) {

  res.setHeader('x-powered-by', 'DokanX Commerce OS');

  next();
};