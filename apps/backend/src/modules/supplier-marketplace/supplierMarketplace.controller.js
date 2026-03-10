const service = require("./supplierMarketplace.service");
const { createAudit } = require("@/utils/audit.util");

async function searchSuppliers(req, res, next) {
  try {
    const data = await service.searchSuppliers({
      q: req.query.q || "",
      category: req.query.category || "",
      area: req.query.area || "",
      lat: service.toNumber(req.query.lat),
      lng: service.toNumber(req.query.lng),
      radiusKm: service.toNumber(req.query.radiusKm, 25),
      limit: service.toNumber(req.query.limit, 20),
    });

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function getSupplierOffers(req, res, next) {
  try {
    const data = await service.listSupplierOffers({
      supplierId: req.params.supplierId,
      q: req.query.q || "",
      category: req.query.category || "",
      brand: req.query.brand || "",
      minPrice: service.toNumber(req.query.minPrice),
      maxPrice: service.toNumber(req.query.maxPrice),
      limit: service.toNumber(req.query.limit, 50),
    });

    res.json({
      success: true,
      supplier: data.supplier,
      count: data.offers.length,
      data: data.offers,
    });
  } catch (err) {
    next(err);
  }
}

async function createSupplierOffer(req, res, next) {
  try {
    const offer = await service.createSupplierOffer({
      supplierId: req.params.supplierId,
      shopId: req.shop?._id,
      payload: req.body,
    });

    await createAudit({
      action: "SUPPLIER_OFFER_CREATED",
      performedBy: req.user?._id || null,
      targetType: "SupplierOffer",
      targetId: offer._id,
      req,
    });

    res.status(201).json({
      success: true,
      data: offer,
    });
  } catch (err) {
    next(err);
  }
}

async function updateSupplierOffer(req, res, next) {
  try {
    const offer = await service.updateSupplierOffer({
      supplierId: req.params.supplierId,
      offerId: req.params.offerId,
      shopId: req.shop?._id,
      payload: req.body,
    });

    await createAudit({
      action: "SUPPLIER_OFFER_UPDATED",
      performedBy: req.user?._id || null,
      targetType: "SupplierOffer",
      targetId: offer._id,
      req,
    });

    res.json({
      success: true,
      data: offer,
    });
  } catch (err) {
    next(err);
  }
}

async function createBulkOrderRequest(req, res, next) {
  try {
    const result = await service.createBulkOrderRequest({
      shopId: req.shop?._id,
      supplierId: req.body.supplierId,
      items: req.body.items || [],
      notes: req.body.notes || "",
      idempotencyKey: req.headers["idempotency-key"] || null,
    });

    await createAudit({
      action: "SUPPLIER_BULK_ORDER_REQUEST_CREATED",
      performedBy: req.user?._id || null,
      targetType: "BulkOrderRequest",
      targetId: result.order._id,
      req,
    });

    res.status(result.idempotencyReplay ? 200 : 201).json({
      success: true,
      idempotencyReplay: result.idempotencyReplay,
      data: result.order,
    });
  } catch (err) {
    next(err);
  }
}

async function listBulkOrderRequests(req, res, next) {
  try {
    const data = await service.listBulkOrderRequests({
      shopId: req.shop?._id,
      mode: req.query.mode || "buyer",
      supplierId: req.query.supplierId || "",
      status: req.query.status || "",
      limit: service.toNumber(req.query.limit, 50),
    });

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function updateBulkOrderStatus(req, res, next) {
  try {
    const action = String(req.body.action || "").toUpperCase();
    const result = await service.updateBulkOrderStatus({
      orderId: req.params.orderId,
      actorShopId: req.shop?._id,
      actorUserId: req.user?._id || null,
      action,
      note: req.body.note || "",
    });

    const auditActionMap = {
      ACCEPT: "SUPPLIER_BULK_ORDER_ACCEPTED",
      REJECT: "SUPPLIER_BULK_ORDER_REJECTED",
      FULFILL: "SUPPLIER_BULK_ORDER_FULFILLED",
      CANCEL: "SUPPLIER_BULK_ORDER_CANCELLED",
    };

    await createAudit({
      action: auditActionMap[action] || "SUPPLIER_BULK_ORDER_STATUS_UPDATED",
      performedBy: req.user?._id || null,
      targetType: "BulkOrderRequest",
      targetId: result.order._id,
      req,
    });

    res.status(200).json({
      success: true,
      idempotencyReplay: result.idempotencyReplay,
      data: result.order,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  searchSuppliers,
  getSupplierOffers,
  createSupplierOffer,
  updateSupplierOffer,
  createBulkOrderRequest,
  listBulkOrderRequests,
  updateBulkOrderStatus,
};
