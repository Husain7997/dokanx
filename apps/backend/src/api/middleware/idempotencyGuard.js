const idempotencyGuard = (req, res, next) => {
  if (!req.headers["x-idempotency-key"]) {
    return res.status(400).json({ error: "Missing idempotency key" });
  }
  next();
};

module.exports = { idempotencyGuard };
