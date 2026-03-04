const cron = require("node-cron");
const audit = require("../audit/audit.engine");
const recover =
require("../../core/selfheal/recover.engine");

module.exports = () => {

  cron.schedule(
    "*/10 * * * *",
    audit.scan
  );

  cron.schedule(
    "*/5 * * * *",
    recover
  );

};