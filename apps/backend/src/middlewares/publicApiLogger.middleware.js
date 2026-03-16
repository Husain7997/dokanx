const ApiUsage = require("../models/apiUsage.model");

async function publicApiLogger(req, _res, next) {
  try {
    if (!req.apiKey) return next();
    const date = new Date().toISOString().slice(0, 10);
    await ApiUsage.findOneAndUpdate(
      {
        apiKeyId: req.apiKey._id,
        path: req.path,
        method: req.method,
        date,
      },
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    );
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = publicApiLogger;
