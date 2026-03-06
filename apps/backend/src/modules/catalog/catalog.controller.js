const catalogService = require("./catalog.service");
const { createAudit } = require("@/utils/audit.util");

async function suggest(req, res, next) {
  try {
    const data = await catalogService.findSuggestions({
      name: req.body?.name || req.query?.name || "",
      barcode: req.body?.barcode || req.query?.barcode || "",
      limit: req.body?.limit || req.query?.limit || 10,
    });

    res.json({
      success: true,
      ...data,
    });
  } catch (err) {
    next(err);
  }
}

async function decision(req, res, next) {
  try {
    const result = await catalogService.applyDecision({
      shopId: req.shop._id,
      actorId: req.user._id,
      action: req.body.action,
      query: req.body.query || {},
      globalProductId: req.body.globalProductId || null,
      localProduct: req.body.localProduct || {},
      allowCreateGlobal: Boolean(req.body.allowCreateGlobal),
      productId: req.body.productId || null,
    });

    await createAudit({
      action: "CATALOG_DECISION_APPLIED",
      performedBy: req.user._id,
      targetType: "CatalogDecision",
      targetId: result.decision._id,
      req,
      meta: {
        action: result.decision.action,
        globalProductId: result.globalProduct?._id || null,
        productId: result.product?._id || null,
      },
    });

    res.status(201).json({
      success: true,
      decision: result.decision,
      globalProduct: result.globalProduct || null,
      product: result.product || null,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  suggest,
  decision,
};
