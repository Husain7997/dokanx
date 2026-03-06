// src/core/infrastructure/queue.engine.js

let queue;

if (process.env.NODE_ENV === "test") {
  queue = {
    async add(name, data, opts = {}) {
      return { id: `test-${Date.now()}`, name, data, opts };
    },
    process() {},
    on() {},
  };
} else {
  const Queue = require("bull");
  const { redisClient } = require("@/system/singletons/redisClient");

  queue = new Queue("dokanx-queue", {
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
}

function addJob(name, data, opts = {}) {
  return queue.add(name, data, opts);
}

module.exports = {
  queue,
  addJob,
};
