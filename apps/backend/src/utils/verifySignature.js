// const crypto = require("crypto");
module.exports = function verifySignature(req, res, next) {
  const signature =
    req.headers["x-webhook-signature"] ||
    req.headers["x-signature"];

  if (!signature) {
    return res.status(400).json({
      message: "Webhook signature missing"
    });
  }

  const secret = process.env.WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("❌ WEBHOOK_SECRET missing");
  }

  if (signature !== secret) {
    return res.status(401).json({
      message: "Invalid webhook signature"
    });
  }

  next();
};
