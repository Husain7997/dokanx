// src/system/workerWrapper.js

const safeWorker = (fn) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error("Worker crash prevented:", error);
      return null;
    }
  };
};

module.exports = { safeWorker };
