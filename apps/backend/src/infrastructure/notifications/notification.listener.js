const bus =
require("../events/eventBus");

bus.on("NOTIFICATION", ({ event, payload }) => {
  console.log(
    "🔔 Notification:",
    event,
    payload
  );
});
