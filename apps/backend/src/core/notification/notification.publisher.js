// src/core/notification/notification.publisher.js

const {eventBus} = require("@/core/infrastructure");

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