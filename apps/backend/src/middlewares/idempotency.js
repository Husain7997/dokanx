const RequestLog = require('../models/RequestLog');

module.exports = async (req, res, next) => {
  const key = req.headers['idempotency-key'];
  if (!key) return next();

  const exists = await RequestLog.findOne({ key });
  if (exists) {
    return res.json(exists.response);
  }

  res.on('finish', async () => {
    await RequestLog.create({
      key,
      response: res.locals.response,
    });
  });

  next();
};
