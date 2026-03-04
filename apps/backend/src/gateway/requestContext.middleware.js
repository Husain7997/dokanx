const { v4: uuid } = require('uuid');

/**
 * Request tracing
 */

module.exports = function requestContext(req, res, next) {

  req.requestId = uuid();

  res.setHeader('x-request-id', req.requestId);

  next();
};