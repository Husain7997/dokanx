const bus =
require("../events/eventBus");

exports.notify = async (event, payload) => {
  bus.emit("NOTIFICATION", {
    event,
    payload,
  });
};
