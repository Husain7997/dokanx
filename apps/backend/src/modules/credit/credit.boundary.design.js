/**
 * DESIGN CONTRACT ONLY
 *
 * Credit Flow:
 *
 * ORDER CREATED
 * → Credit Issued
 * → Credit Ledger Entry
 *
 * PAYMENT RECEIVED
 * → Credit Reduced
 * → Wallet Credit via FinancialEngine
 *
 * RULE:
 * Credit Engine CAN CALL FinancialEngine
 * FinancialEngine MUST NOT CALL Credit Engine
 */