const { isMongoConnected, getMongoState } = require("../infrastructure/database/mongo.client");

module.exports = function dbAvailability(req, _res, next) {
  if (isMongoConnected()) {
    return next();
  }

  const error = new Error("Database temporarily unavailable");
  error.statusCode = 503;
  error.code = "DB_UNAVAILABLE";
  error.retryable = true;
  error.details = getMongoState();
  return next(error);
};
