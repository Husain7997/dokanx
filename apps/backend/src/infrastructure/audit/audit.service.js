const Audit = require("../../models/audit.model");

exports.record = async ({
  actor,
  action,
  entity,
  meta = {},
}) => {
  await Audit.create({
    actor,
    action,
    entity,
    meta,
  });
};
