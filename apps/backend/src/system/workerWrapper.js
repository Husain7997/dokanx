// src/system/workerWrapper.js

const safeWorker = (fn) => {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (error) {
      console.error("Worker crash prevented:", error);
    }
  };
};

module.exports = { safeWorker };