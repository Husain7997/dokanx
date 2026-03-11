const { logger } = require("@/core/infrastructure");
const response = require("@/utils/controllerResponse");
const { toCSV } = require("@/utils/csv.util");
const service = require("./warehouse.service");

function resolveShopId(req) {
  return req.shop?._id || req.user?.shopId || null;
}

exports.createWarehouse = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);

    const row = await service.createWarehouse({
      shopId,
      actorId: req.user?._id || null,
      payload: req.body,
    });
    return response.success(res, { data: row }, 201);
  } catch (err) {
    logger.error({ err: err.message }, "Create warehouse failed");
    return next(err);
  }
};

exports.listWarehouses = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);
    const rows = await service.listWarehouses({ shopId });
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
};

exports.upsertWarehouseStock = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);
    const row = await service.upsertWarehouseStock({ shopId, payload: req.body });
    return response.updated(res, req, row);
  } catch (err) {
    logger.error({ err: err.message }, "Upsert warehouse stock failed");
    return next(err);
  }
};

exports.listWarehouseStocks = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);
    const rows = await service.listWarehouseStocks({ shopId, filters: req.query });
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
};

exports.createTransferRequest = async (req, res) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);
    const row = await service.createTransferRequest({
      shopId,
      actorId: req.user?._id || null,
      payload: req.body,
    });
    return response.success(res, { data: row }, 201);
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.listTransfers = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);
    const rows = await service.listTransfers({ shopId, filters: req.query });
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
};

exports.updateTransferStatus = async (req, res) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);
    const row = await service.updateTransferStatus({
      shopId,
      transferId: req.params.transferId,
      actorId: req.user?._id || null,
      status: req.body.status,
      note: req.body.note || "",
    });
    return response.updated(res, req, row);
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.getStockAlerts = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);
    const rows = await service.getStockAlerts({ shopId, filters: req.query });
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
};

exports.exportWarehouseStocksCSV = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);
    const rows = await service.buildWarehouseStockExportRows({ shopId, filters: req.query });
    const csv = toCSV(rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="warehouse-stocks.csv"');
    return res.send(csv);
  } catch (err) {
    return next(err);
  }
};

exports.exportTransfersCSV = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);
    const rows = await service.buildTransferExportRows({ shopId, filters: req.query });
    const csv = toCSV(rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="warehouse-transfers.csv"');
    return res.send(csv);
  } catch (err) {
    return next(err);
  }
};
