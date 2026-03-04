// src/core/notification/notification.publisher.js

const eventBus = require("@/infrastructure/events/eventBus");

/**
 * Publish user notification event
 */
function notifyUser({ userId, event, payload }) {

  eventBus.emit("USER_NOTIFICATION", {
    userId,
    event,
    payload,
    createdAt: new Date(),
  });

}

module.exports = {
  notifyUser,
};