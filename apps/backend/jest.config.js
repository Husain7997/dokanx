module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/test/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.js"],
  resolver: "<rootDir>/jest.resolver.js",
  testTimeout: 30000,
  clearMocks: true,
  verbose: true,
  maxWorkers: 1,
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { isolatedModules: true, tsconfig: false }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
