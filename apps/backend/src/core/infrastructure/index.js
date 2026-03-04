// src/core/infrastructure/index.js

const redis = require("./redis.client");
const queueEngine = require("./queue.engine");
const lockManager = require("./lock.manager");
const logger = require("./logger");



module.exports = {
  redis,
  queue: queueEngine.queue,
  addJob: queueEngine.addJob,
  lockManager,
  logger,
  

};