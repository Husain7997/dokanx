// src/core/infrastructure/queue.engine.js

const Queue = require("bull");
const redis = require("./redis.client");

const queue = new Queue("dokanx-queue", {
  createClient: function (type) {
    switch (type) {
      case "client":
        return redis;
      case "subscriber":
        return redis.duplicate();
      default:
        return redis.duplicate();
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