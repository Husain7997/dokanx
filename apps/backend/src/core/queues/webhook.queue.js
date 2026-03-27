const { createDomainQueue } = require("./create-domain-queue");

module.exports = createDomainQueue({
  name: "dokanx:webhook",
  defaultAttempts: 6,
  defaultBackoffDelay: 10000,
});
