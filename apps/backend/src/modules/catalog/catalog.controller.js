const catalogService = require("./catalog.service");
const { createAudit } = require("@/utils/audit.util");

const CatalogGlobalProduct = require("./models/catalogGlobalProduct.model");




async function searchGlobalProducts(req, res, next) {
  try {
    const {
      q,
      barcode,
      brand,
      category,
      limit = 20
    } = req.query;

    const results = await catalogService.searchGlobalProducts({
      keyword: q,
      barcode,
      brand,
      category,
      limit
    });

    res.json({
      success: true,
      count: results.length,
      data: results
    });

  } catch (error) {
    next(error);
  }
}



async function importGlobalProduct(req, res, next) {
  try {
    const { globalProductId, price, stock } = req.body;
    const shopId = req.shop?._id;

    if (!globalProductId) {
      return res.status(400).json({
        success: false,
        message: "globalProductId required"
      });
    }

    // Fetch global product
    const globalProduct = await CatalogGlobalProduct.findById(globalProductId);

    if (!globalProduct) {
      return res.status(404).json({
        success: false,
        message: "Global product not found"
      });
    }

    // Create shop product via existing service
    const shopProduct = await catalogService.upsertLocalProduct({
      shopId,
      payload: {
        name: globalProduct.canonicalName,
        brand: globalProduct.brand,
        category: globalProduct.category,
        price,
        stock,
      },
    });

    await createAudit({
      action: "CATALOG_GLOBAL_PRODUCT_IMPORTED",
      performedBy: req.user?._id || null,
      targetType: "Product",
      targetId: shopProduct._id,
      req,
    });

    return res.status(201).json({
      success: true,
      data: shopProduct
    });

  } catch (error) {
    next(error);
  }
}



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

async function createGlobalProduct(req, res, next) {
  try {
    const result = await catalogService.createGlobalProduct({
      name: req.body.name,
      brand: req.body.brand,
      category: req.body.category,
      barcode: req.body.barcode,
      imageUrl: req.body.imageUrl,
      aliases: req.body.aliases,
      createdByShop: req.shop?._id || null,
    });

    await createAudit({
      action: "CATALOG_GLOBAL_PRODUCT_CREATED",
      performedBy: req.user?._id || null,
      targetType: "CatalogGlobalProduct",
      targetId: result.product._id,
      req,
    });

    res.status(result.dedupeStatus === "created" ? 201 : 200).json({
      success: true,
      dedupeStatus: result.dedupeStatus,
      dedupeReason: result.dedupeReason,
      canonicalKey: result.canonicalKey,
      data: result.product,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  suggest,
  decision,
  importGlobalProduct,
  searchGlobalProducts,
  createGlobalProduct,
};

