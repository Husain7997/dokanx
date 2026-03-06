module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/test/platform.validation.test.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  clearMocks: true,
  verbose: true,
  maxWorkers: 1
};
