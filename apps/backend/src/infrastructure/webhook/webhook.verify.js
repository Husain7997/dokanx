const crypto = require("crypto");

module.exports = (payload, signature) => {
  const expected = crypto
    .createHmac("sha256", process.env.WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  return expected === signature;
};
