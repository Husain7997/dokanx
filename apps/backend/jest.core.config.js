const dbBackedTestPatterns = [
  "<rootDir>/src/test/approval.maker-checker.test.js",
  "<rootDir>/src/test/autoSettlement.test.js",
  "<rootDir>/src/test/reconciliation.compliance.test.js",
  "<rootDir>/src/test/refundAfterSettlement.test.js",
  "<rootDir>/src/test/settlement.double.test.js",
  "<rootDir>/src/test/settlement.multi.test.js",
  "<rootDir>/src/test/settlement.test.js",
  "<rootDir>/src/test/tax.engine.test.js",
  "<rootDir>/src/test/wallet.ledger.test.js",
];

const testPathIgnorePatterns = [
  "<rootDir>/src/test/payout/",
  "<rootDir>/src/test/payout.test.js",
  "<rootDir>/src/test/payoutRetry.test.js",
  "<rootDir>/src/test/adjustment.refund.test.js",
];

if (process.env.TEST_SKIP_DB === "true") {
  testPathIgnorePatterns.push(...dbBackedTestPatterns);
}

module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/test/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  testPathIgnorePatterns,
  testTimeout: 30000,
  clearMocks: true,
  verbose: true,
  maxWorkers: 1
};
