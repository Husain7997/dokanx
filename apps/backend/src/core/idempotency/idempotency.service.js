const crypto = require("crypto");
const Idempotency = require("./idempotency.model");

function hashRequest(body) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(body))
    .digest("hex");
}

async function findExisting(key) {
  return Idempotency.findOne({ key });
}

async function saveResult({
  key,
  route,
  requestHash,
  response,
  statusCode,
  shop,
}) {
  return Idempotency.create({
    key,
    route,
    requestHash,
    response,
    statusCode,
    shop,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
}

module.exports = {
  hashRequest,
  findExisting,
  saveResult,
};