const router = require("express").Router();
const { tenantAccess } = require("@/middlewares/accessPolicy.middleware");
const { validateBody, validateParams, validateQuery } = require("@/middlewares/validateRequest");
const controller = require("./warehouse.controller");
const validator = require("./warehouse.validator");

router.post(
  "/locations",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateBody(validator.validateWarehouseBody),
  controller.createWarehouse
);

router.get(
  "/locations",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  controller.listWarehouses
);

router.put(
  "/stocks",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateBody(validator.validateWarehouseStockBody),
  controller.upsertWarehouseStock
);

router.get(
  "/stocks",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  controller.listWarehouseStocks
);

router.get(
  "/export/stocks",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  controller.exportWarehouseStocksCSV
);

router.post(
  "/transfers",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateBody(validator.validateTransferBody),
  controller.createTransferRequest
);

router.get(
  "/transfers",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  controller.listTransfers
);

router.get(
  "/export/transfers",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  controller.exportTransfersCSV
);

router.patch(
  "/transfers/:transferId/status",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateIdParam),
  validateBody(validator.validateTransferStatusBody),
  controller.updateTransferStatus
);

router.get(
  "/alerts",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateAlertsQuery),
  controller.getStockAlerts
);

module.exports = router;
