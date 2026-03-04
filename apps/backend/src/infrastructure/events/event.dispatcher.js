const Outbox =
 require("../../models/outbox.model");

async function publishEvent(
  type,
  payload,
  meta = {}
) {

  await Outbox.create({
    type,
    payload,
    meta,
    processed: false,
    createdAt: new Date()
  });

}

module.exports = {
  publishEvent
};