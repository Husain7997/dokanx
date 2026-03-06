export const architectureMap = {
  layers: {
    api: "controllers + routes",
    application: "services + use-cases",
    domain: "business rules",
    financial: "double entry engine",
    infrastructure: "db, redis, event, notification",
    workers: "background processors"
  },
  rules: {
    controllersCannotImport: ["financial", "workers"],
    servicesCannotImport: ["controllers"],
    workersCannotMutateLedger: true,
    financialIsSingleSourceOfTruth: true
  }
};