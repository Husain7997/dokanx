module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/test/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.js"],
  testTimeout: 30000,
  clearMocks: true,
  verbose: true,
  maxWorkers: 1,
  moduleDirectories: ["node_modules", "../../node_modules"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
