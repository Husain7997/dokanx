const { createDomainQueue } = require("./create-domain-queue");

module.exports = createDomainQueue({
  name: "dokanx:payment",
  defaultAttempts: 5,
  defaultBackoffDelay: 3000,
});
