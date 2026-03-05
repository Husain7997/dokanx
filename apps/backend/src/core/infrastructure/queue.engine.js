// src/core/infrastructure/queue.engine.js

const Queue = require("bull");
const { redisClient } = require("@/system/singletons/redisClient");

const queue = new Queue("dokanx-queue", {
  createClient: function (type) {
    switch (type) {
      case "client":
        return redisClient;
      case "subscriber":
        return redisClient.duplicate();
      default:
        return redisClient.duplicate();
    }
  },
});

function addJob(name, data, opts = {}) {
  return queue.add(name, data, opts);
}

module.exports = {
  queue,
  addJob,
};
