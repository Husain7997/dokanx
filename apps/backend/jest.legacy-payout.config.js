module.exports = {
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/src/test/payout/**/*.test.js",
    "<rootDir>/src/test/payout.test.js",
    "<rootDir>/src/test/payoutRetry.test.js",
    "<rootDir>/src/test/adjustment.refund.test.js"
  ],
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  testTimeout: 30000,
  clearMocks: true,
  verbose: true,
  maxWorkers: 1
};
