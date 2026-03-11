const Product = require("../models/product.model");
const Inventory = require("../models/Inventory.model");
const { createAudit } = require("../utils/audit.util");
const catalogService = require("@/modules/catalog/catalog.service");
const { t, logger } = require("@/core/infrastructure");

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mergeSuggestedFields(draft, suggestion) {
  if (!suggestion) return draft;
  return {
    ...draft,
    name: draft.name || suggestion.name || "",
    brand: draft.brand || suggestion.brand || "",
    category: draft.category || suggestion.category || "",
    barcode: draft.barcode || suggestion.barcode || "",
    imageUrl: draft.imageUrl || suggestion.imageUrl || "",
  };
}

exports.smartSuggest = async (req, res) => {
  try {
    const local = req.body?.localProduct || {};
    const name = local.name || req.body?.name || "";
    const barcode = local.barcode || req.body?.barcode || "";

    const suggestion = await catalogService.findSuggestions({
      name,
      barcode,
      limit: req.body?.limit || 10,
    });

    const prefill = mergeSuggestedFields(
      {
        name: String(name || "").trim(),
        brand: String(local.brand || "").trim(),
        category: String(local.category || "").trim(),
        barcode: String(barcode || "").trim(),
        imageUrl: String(local.imageUrl || "").trim(),
        price: safeNumber(local.price, 0),
        stock: safeNumber(local.stock, 0),
      },
      suggestion.bestMatch
    );

    res.json({
      success: true,
      suggestion,
      prefill,
    });
  } catch (err) {
    logger.error({ err: err.message }, "Smart suggest failed");
    res.status(500).json({
      success: false,
      message: "Smart suggestion failed",
    });
  }
};

exports.createProduct = async (req, res) => {
  try {
    if (!req.shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    const smartEntry = req.body?.smartEntry || {};

    const baseDraft = {
      name: String(req.body?.name || "").trim(),
      brand: String(req.body?.brand || "").trim(),
      category: String(req.body?.category || "").trim(),
      barcode: String(req.body?.barcode || "").trim(),
      imageUrl: String(req.body?.imageUrl || "").trim(),
      price: safeNumber(req.body?.price, 0),
      stock: safeNumber(req.body?.stock, 0),
    };

    if (!baseDraft.name) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    let suggestionResult = null;
    let selectedSuggestion = null;
    let finalDraft = { ...baseDraft };

    if (smartEntry.enabled === true) {
      suggestionResult = await catalogService.findSuggestions({
        name: smartEntry.queryName || baseDraft.name,
        barcode: smartEntry.queryBarcode || baseDraft.barcode,
        limit: smartEntry.limit || 10,
      });

      const suggestions = suggestionResult.suggestions || [];

      if (smartEntry.globalProductId) {
        selectedSuggestion =
          suggestions.find(
            s => String(s.globalProductId) === String(smartEntry.globalProductId)
          ) || null;
      }

      if (!selectedSuggestion) {
        selectedSuggestion = suggestionResult.bestMatch || null;
      }

      if (smartEntry.applySuggestion !== false && selectedSuggestion) {
        finalDraft = mergeSuggestedFields(finalDraft, selectedSuggestion);
      }
    }

    const duplicate = await Product.findOne({
      shopId: req.shop._id,
      name: new RegExp(`^${escapeRegex(finalDraft.name)}$`, "i"),
    }).lean();

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: "Product already exists in this shop",
      });
    }

    const product = await Product.create({
      name: finalDraft.name,
      brand: finalDraft.brand || "",
      category: finalDraft.category || "",
      barcode: finalDraft.barcode || "",
      imageUrl: finalDraft.imageUrl || "",
      price: finalDraft.price,
      shopId: req.shop._id,
      owner: req.user._id,
    });

    const inventory = await Inventory.create({
      shopId: req.shop._id,
      product: product._id,
      stock: Number(finalDraft.stock) || 0,
      reserved: 0,
      inventoryVersion: 0,
      isActive: true,
      isReconciling: false,
    });

    let catalogDecision = null;

    if (smartEntry.enabled === true && smartEntry.recordDecision === true) {
      const action = String(
        smartEntry.action || (selectedSuggestion ? "ACCEPT" : "EDIT")
      ).toUpperCase();

      if (action !== "IGNORE") {
        const decisionResult = await catalogService.applyDecision({
          shopId: req.shop._id,
          actorId: req.user._id,
          action,
          query: {
            name: smartEntry.queryName || baseDraft.name,
            barcode: smartEntry.queryBarcode || baseDraft.barcode,
          },
          globalProductId:
            selectedSuggestion?.globalProductId ||
            smartEntry.globalProductId ||
            null,
          localProduct: {
            ...finalDraft,
            price: finalDraft.price,
            stock: finalDraft.stock,
          },
          allowCreateGlobal: Boolean(smartEntry.allowCreateGlobal),
          productId: product._id,
        });

        catalogDecision = {
          decisionId: decisionResult.decision?._id || null,
          action: decisionResult.decision?.action || action,
          globalProductId: decisionResult.globalProduct?._id || null,
        };
      }
    }

    await createAudit({
      action: "CREATE_PRODUCT",
      performedBy: req.user._id,
      targetType: "Product",
      targetId: product._id,
      req,
      meta: {
        smartEntryApplied: smartEntry.enabled === true,
        suggestionUsed: Boolean(selectedSuggestion),
      },
    });

    res.status(201).json({
      success: true,
      product,
      inventory,
      smartEntry: {
        enabled: smartEntry.enabled === true,
        suggestionFound: suggestionResult?.found || false,
        selectedSuggestion: selectedSuggestion || null,
        askToAddGlobal: suggestionResult?.askToAddGlobal || false,
        decision: catalogDecision,
      },
    });
  } catch (err) {
    logger.error({ err: err.message }, "Create product failed");
    res.status(500).json({
      success: false,
      message: "Product creation failed",
    });
  }
};

exports.getProductsByShop = async (req, res) => {
  try {
    const { shopId } = req.params;

    const products = await Product.find({ shopId });

    res.status(200).json({
      message: t("common.updated", req.lang),
      count: products.length,
      data: products,
    });
  } catch (error) {
    logger.error({ err: error.message }, "Failed to fetch products");
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
};

exports.getProductInventory = async (req, res) => {
  const inventory = await Inventory.findOne({
    shopId: req.shop._id,
    product: req.params.productId,
  });

  if (!inventory)
    return res.status(404).json({
      message: "Inventory not found",
    });

  res.json({
    available: inventory.stock,
    reserved: inventory.reserved,
  });
};
