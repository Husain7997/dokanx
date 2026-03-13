const service = require("./idempotency.service");

module.exports = async (req, res, next) => {
  const key =
    String(req.headers["idempotency-key"] || req.headers["x-idempotency-key"] || "").trim();

  if (!key) {
    return next();
  }

  const existing = await service.findExisting(key);

  if (existing) {
    return res.status(existing.statusCode).json(existing.response);
  }

  const original = res.json.bind(res);

  res.json = async (body) => {
    await service.saveResult({
      key,
      route: req.originalUrl,
      requestHash: JSON.stringify(req.body),
      response: body,
      statusCode: res.statusCode,
      shop: req.shop?._id,
    });

    return original(body);
  };

  return next();
};
