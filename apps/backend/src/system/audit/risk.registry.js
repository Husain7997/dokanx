const riskRegistry = {
  duplicateEventBus: false,
  duplicateLockManager: false,
  ledgerMutationOutsideEngine: false,
  defaultExportViolation: false,
  circularDependencyDetected: false,
  tenantLeakRisk: false
};

module.exports = { riskRegistry };
