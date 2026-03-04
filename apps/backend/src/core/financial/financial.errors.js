class FinancialError extends Error {
  constructor(messageKey, statusCode = 400) {
    super(messageKey);
    this.messageKey = messageKey;
    this.statusCode = statusCode;
  }
}

class InsufficientBalance extends FinancialError {
  constructor() {
    super("finance.INSUFFICIENT_BALANCE", 400);
  }
}

class FinancialLockError extends FinancialError {
  constructor() {
    super("finance.LOCK_FAILED", 409);
  }
}

class FinancialInvariantError extends Error {}

module.exports = {
  FinancialError,
  InsufficientBalance,
  FinancialLockError,
  FinancialInvariantError
};