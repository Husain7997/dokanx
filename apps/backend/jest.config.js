module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/test/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.js"],
  testTimeout: 30000,
  clearMocks: true,
  verbose: true,
  maxWorkers: 1

};
