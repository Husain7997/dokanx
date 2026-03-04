const {
  findExisting,
  saveResult,
} = require("./idempotency.service");

async function runOnce(key, handler) {
  const existing = await findExisting(key);

  if (existing) return existing.response;

  const result = await handler();

  await saveResult({
    key,
    route: "worker",
    requestHash: key,
    response: result,
    statusCode: 200,
  });

  return result;
}

module.exports = {
  runOnce,
};