module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/test/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  testPathIgnorePatterns: [
    "<rootDir>/src/test/payout/",
    "<rootDir>/src/test/payout.test.js",
    "<rootDir>/src/test/payoutRetry.test.js",
    "<rootDir>/src/test/adjustment.refund.test.js"
  ],
  testTimeout: 30000,
  clearMocks: true,
  verbose: true,
  maxWorkers: 1
};
