const { createDomainQueue } = require("./create-domain-queue");

module.exports = createDomainQueue({
  name: "dokanx:analytics",
  defaultAttempts: 3,
  defaultBackoffDelay: 15000,
});
