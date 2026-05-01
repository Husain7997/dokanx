const crypto = require("crypto");

module.exports = function verifySignature(req, res, next) {
  const signature = req.headers["x-webhook-signature"] || req.headers["x-signature"];

  if (!signature) {
    return res.status(400).json({
      message: "Webhook signature missing",
    });
  }

  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("WEBHOOK_SECRET missing");
  }

  const expected = crypto.createHmac("sha256", secret).update(req.rawBody || "").digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(String(signature));

  if (expectedBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
    return res.status(401).json({
      message: "Invalid webhook signature",
    });
  }

  return next();
};
