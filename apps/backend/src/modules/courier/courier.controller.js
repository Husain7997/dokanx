const { logger } = require("@/core/infrastructure");
const response = require("@/utils/controllerResponse");
const { toCSV } = require("@/utils/csv.util");
const service = require("./courier.service");

function resolveShopId(req) {
  return req.shop?._id || req.user?.shopId || null;
}

exports.createShipment = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);

    const shipment = await service.createShipment({
      shopId,
      actorId: req.user?._id || null,
      payload: req.body,
    });

    return response.success(res, { data: shipment }, 201);
  } catch (err) {
    logger.error({ err: err.message }, "Create courier shipment failed");
    return next(err);
  }
};

exports.listShipments = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);

    const rows = await service.listShipments({ shopId, filters: req.query });
    return response.updated(res, req, rows);
  } catch (err) {
    logger.error({ err: err.message }, "List courier shipments failed");
    return next(err);
  }
};

exports.getShipment = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);

    const shipment = await service.getShipment({
      shopId,
      shipmentId: req.params.shipmentId,
    });

    if (!shipment) return response.notFound(res, "Shipment");
    return response.updated(res, req, shipment);
  } catch (err) {
    return next(err);
  }
};

exports.handleWebhook = async (req, res) => {
  try {
    const shipment = await service.applyWebhookEvent({
      payload: req.body,
    });

    return response.updated(res, req, shipment);
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }
};

exports.reconcileCod = async (req, res) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);

    const shipment = await service.reconcileCod({
      shopId,
      shipmentId: req.params.shipmentId,
      actualAmount: req.body.actualAmount,
    });

    return response.updated(res, req, shipment);
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }
};

exports.dashboard = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);

    const data = await service.getCourierDashboard({
      shopId,
      filters: req.query,
    });

    return response.updated(res, req, data);
  } catch (err) {
    return next(err);
  }
};

exports.codMismatches = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);

    const data = await service.listCodMismatches({
      shopId,
      limit: req.query.limit || 50,
    });

    return response.updated(res, req, data);
  } catch (err) {
    return next(err);
  }
};

exports.exportShipmentsCSV = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);

    const rows = await service.buildShipmentExportRows({
      shopId,
      filters: req.query,
    });

    const csv = toCSV(rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="courier-shipments.csv"');
    return res.send(csv);
  } catch (err) {
    return next(err);
  }
};
