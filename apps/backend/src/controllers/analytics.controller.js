const {
  buildWarehouseSnapshots,
  listSnapshots,
} = require("../analytics/analyticsWarehouse.service");
const Event = require("../models/event.model");

async function getWarehouseSnapshots(req, res, next) {
  try {
    const { metricType, dateFrom, dateTo, shopId } = req.query || {};
    const tenantShopId = req.tenant?._id || null;
    const resolvedShopId =
      req.user?.role === "ADMIN" && shopId ? shopId : tenantShopId;

    if (!resolvedShopId) {
      return res.json({ data: [] });
    }

    const snapshots = await listSnapshots({
      shopId: resolvedShopId,
      metricType,
      dateFrom,
      dateTo,
    });

    return res.json({ data: snapshots });
  } catch (error) {
    return next(error);
  }
}

async function buildWarehouse(req, res, next) {
  try {
    const { dateFrom, dateTo, shopId } = req.body || {};
    const tenantShopId = req.tenant?._id || null;
    const resolvedShopId =
      req.user?.role === "ADMIN" && shopId ? shopId : tenantShopId;

    if (!resolvedShopId) {
      return res.status(400).json({ message: "Tenant shop not resolved." });
    }

    await buildWarehouseSnapshots({
      shopId: resolvedShopId,
      dateFrom,
      dateTo,
    });

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getWarehouseSnapshots,
  buildWarehouse,
  trackEvent,
};

async function trackEvent(req, res, next) {
  try {
    const { type, productId, productIds, shopId, context, sectionId, sectionType, themeId, ctaLink, host } = req.body || {};
    const supported = [
      "PRODUCT_VIEW",
      "REC_IMPRESSION",
      "REC_CLICK",
      "STOREFRONT_SECTION_IMPRESSION",
      "STOREFRONT_SECTION_CTA_CLICK",
    ];

    if (!supported.includes(type)) {
      return res.status(400).json({ message: "Unsupported event type" });
    }

    if (type === "REC_IMPRESSION") {
      const ids = Array.isArray(productIds) ? productIds.filter(Boolean).slice(0, 50) : [];
      if (!ids.length) {
        return res.status(400).json({ message: "productIds required" });
      }
      await Event.create({
        type,
        aggregateId: null,
        payload: { productIds: ids, context: context || null, shopId: shopId || null },
        metadata: { user: req.user?._id || null, shopId: shopId || null },
      });
      return res.json({ success: true });
    }

    if (type === "STOREFRONT_SECTION_IMPRESSION" || type === "STOREFRONT_SECTION_CTA_CLICK") {
      if (!sectionId || !sectionType) {
        return res.status(400).json({ message: "sectionId and sectionType required" });
      }

      await Event.create({
        type,
        aggregateId: null,
        payload: {
          sectionId: String(sectionId),
          sectionType: String(sectionType),
          themeId: themeId ? String(themeId) : null,
          context: context || "storefront-home",
          ctaLink: ctaLink ? String(ctaLink) : null,
          host: host ? String(host) : null,
          shopId: shopId || null,
        },
        metadata: { user: req.user?._id || null, shopId: shopId || null },
      });
      return res.json({ success: true });
    }

    if (!productId) {
      return res.status(400).json({ message: "productId required" });
    }

    await Event.create({
      type,
      aggregateId: productId,
      payload: { productId, context: context || null, shopId: shopId || null },
      metadata: { user: req.user?._id || null, shopId: shopId || null },
    });

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
}
