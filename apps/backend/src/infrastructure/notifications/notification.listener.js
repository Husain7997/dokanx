const eventBus = require("@/infrastructure/events/eventBus");
const NotificationService =
  require("./notification.service");

eventBus.on(
  "USER_NOTIFICATION",
  async ({ userId, event, payload }) => {

    await NotificationService.send(
      { _id: userId },
      event,
      payload
    );

  }
);

console.log("✅ Notification listener registered");