const Product = require("../models/product.model");
const Inventory = require("../models/Inventory.model");
const ProductReview = require("../models/productReview.model");
const { t } = require("@/core/infrastructure");

function normalizeProtectionConfig(value, fallbackType) {
  if (!value || typeof value !== "object") {
    return {
      enabled: false,
      durationDays: 0,
      type: fallbackType,
    };
  }

  return {
    enabled: Boolean(value.enabled),
    durationDays: Math.max(0, Number(value.durationDays || 0)),
    type: value.type ? String(value.type) : fallbackType,
  };
}

function normalizeProductPayload(body) {
  const source = body || {};
  return {
    name: String(source.name || "").trim(),
    category: String(source.category || "General").trim() || "General",
    price: Number(source.price || 0),
    costPrice: Math.max(0, Number(source.costPrice || 0)),
    stock: Math.max(0, Number(source.stock || 0)),
    barcode: typeof source.barcode === "string" && source.barcode.trim() ? source.barcode.trim() : null,
    imageUrl: typeof source.imageUrl === "string" ? source.imageUrl.trim() : "",
    slug: typeof source.slug === "string" && source.slug.trim() ? source.slug.trim() : null,
    discountRate: Math.max(0, Math.min(100, Number(source.discountRate || 0))),
    warranty: normalizeProtectionConfig(source.warranty, "service"),
    guarantee: normalizeProtectionConfig(source.guarantee, "replacement"),
  };
}

async function syncInventory(shopId, productId, stock) {
  await Inventory.updateOne(
    { shopId, product: productId },
    {
      $set: {
        stock,
        isActive: true,
      },
      $setOnInsert: {
        reserved: 0,
        inventoryVersion: 0,
        isReconciling: false,
      },
    },
    { upsert: true }
  );
}

async function createProductRecord({ shopId, ownerId, source }) {
  const payload = normalizeProductPayload(source);
  if (!payload.name) {
    throw new Error("Product name is required");
  }

  const product = await Product.create({
    name: payload.name,
    category: payload.category,
    price: payload.price,
    costPrice: payload.costPrice,
    stock: payload.stock,
    discountRate: payload.discountRate,
    slug: payload.slug,
    barcode: payload.barcode,
    imageUrl: payload.imageUrl,
    shopId,
    owner: ownerId,
    reserved: 0,
    inventoryVersion: 0,
    warranty: payload.warranty,
    guarantee: payload.guarantee,
  });

  await Inventory.create({
    shopId,
    product: product._id,
    stock: payload.stock,
    reserved: 0,
    inventoryVersion: 0,
    isActive: true,
    isReconciling: false,
  });

  return product;
}

exports.createProduct = async (req, res) => {
  try {
    if (!req.shop) {
      return res.status(404).json({ success: false, message: "Shop not found" });
    }

    const product = await createProductRecord({
      shopId: req.shop._id,
      ownerId: req.user._id,
      source: req.body,
    });

    return res.status(201).json({ success: true, data: product });
  } catch (err) {
    console.error("CREATE PRODUCT ERROR:", err);
    return res.status(err.message === "Product name is required" ? 400 : 500).json({
      success: false,
      message: err.message === "Product name is required" ? err.message : "Product creation failed",
    });
  }
};

exports.bulkCreateProducts = async (req, res) => {
  try {
    if (!req.shop) {
      return res.status(404).json({ success: false, message: "Shop not found" });
    }

    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!rows.length) {
      return res.status(400).json({ success: false, message: "rows array is required" });
    }

    const created = [];
    const errors = [];

    for (let index = 0; index < rows.length; index += 1) {
      try {
        const product = await createProductRecord({
          shopId: req.shop._id,
          ownerId: req.user._id,
          source: rows[index],
        });
        created.push(product);
      } catch (error) {
        errors.push({
          index,
          name: rows[index]?.name || "",
          message: error instanceof Error ? error.message : "Unable to create this row",
        });
      }
    }

    return res.status(created.length ? 201 : 400).json({
      success: created.length > 0,
      createdCount: created.length,
      failedCount: errors.length,
      data: created,
      errors,
    });
  } catch (err) {
    console.error("BULK PRODUCT CREATE ERROR:", err);
    return res.status(500).json({ success: false, message: "Bulk product creation failed" });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    if (!req.shop) {
      return res.status(404).json({ success: false, message: "Shop not found" });
    }

    const { productId } = req.params;
    const product = await Product.findOne({ _id: productId, shopId: req.shop._id });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const payload = normalizeProductPayload({ ...product.toObject(), ...req.body });
    product.name = payload.name;
    product.category = payload.category;
    product.price = payload.price;
    product.costPrice = payload.costPrice;
    product.stock = payload.stock;
    product.discountRate = payload.discountRate;
    product.slug = payload.slug;
    product.barcode = payload.barcode;
    product.imageUrl = payload.imageUrl;
    product.warranty = payload.warranty;
    product.guarantee = payload.guarantee;

    await product.save();
    await syncInventory(req.shop._id, product._id, payload.stock);

    return res.status(200).json({ success: true, data: product });
  } catch (err) {
    console.error("UPDATE PRODUCT ERROR:", err);
    return res.status(500).json({ success: false, message: "Product update failed" });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    if (!req.shop) {
      return res.status(404).json({ success: false, message: "Shop not found" });
    }

    const { productId } = req.params;
    const product = await Product.findOne({ _id: productId, shopId: req.shop._id });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    product.isActive = false;
    await product.save();

    await Inventory.updateOne(
      { shopId: req.shop._id, product: product._id },
      { $set: { isActive: false } }
    );

    return res.status(200).json({ success: true, message: "Product archived" });
  } catch (err) {
    console.error("DELETE PRODUCT ERROR:", err);
    return res.status(500).json({ success: false, message: "Product archive failed" });
  }
};

exports.getProductsByShop = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { q } = req.query;
    if (!shopId) {
      return res.status(400).json({ success: false, message: "shopId required" });
    }

    const filter = { shopId, isActive: { $ne: false } };
    if (q) {
      filter.$or = [
        { name: { $regex: String(q), $options: "i" } },
        { category: { $regex: String(q), $options: "i" } },
        { barcode: { $regex: String(q), $options: "i" } },
      ];
    }

    const products = await Product.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ message: t("common.updated", req.lang), count: products.length, data: products });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch products" });
  }
};

exports.listProducts = async (req, res) => {
  try {
    const { shopId, q, limit, minStock, slug } = req.query;
    const filter = { isActive: true };
    if (shopId) filter.shopId = shopId;
    if (slug) filter.slug = slug;
    if (minStock) filter.stock = { $gte: Number(minStock) };
    if (q) {
      filter.$or = [
        { name: { $regex: String(q), $options: "i" } },
        { category: { $regex: String(q), $options: "i" } },
        { barcode: { $regex: String(q), $options: "i" } },
      ];
    }

    const query = Product.find(filter);
    if (limit) query.limit(Number(limit));
    const products = await query.lean();

    return res.json({ count: products.length, data: products });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch products" });
  }
};

exports.getProductDetail = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId).lean();
    if (!product) return res.status(404).json({ message: "Product not found" });
    return res.json({ data: product });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch product" });
  }
};

exports.getProductInventory = async (req, res) => {
  const inventory = await Inventory.findOne({
    shopId: req.shop._id,
    product: req.params.productId,
  });

  if (!inventory) {
    return res.status(404).json({ message: "Inventory not found" });
  }

  return res.json({ available: inventory.stock, reserved: inventory.reserved });
};

exports.getProductByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    const shopId = req.query.shopId || req.shop?._id;
    if (!barcode || !shopId) {
      return res.status(400).json({ message: "barcode and shopId required" });
    }

    const product = await Product.findOne({ shopId, barcode, isActive: { $ne: false } }).lean();
    if (!product) return res.status(404).json({ message: "Product not found" });

    return res.json({ data: product });
  } catch (err) {
    return res.status(500).json({ message: "Barcode lookup failed" });
  }
};

exports.listProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await ProductReview.find({ productId, status: "APPROVED" }).sort({ createdAt: -1 }).lean();
    return res.json({ data: reviews });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load reviews" });
  }
};

exports.createProductReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, message, reviewerName } = req.body || {};
    if (!rating || !message) {
      return res.status(400).json({ message: "rating and message required" });
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const entry = await ProductReview.create({
      productId,
      shopId: product.shopId,
      userId: req.user?._id || null,
      reviewerName: reviewerName || req.user?.name || "Guest",
      rating: Math.max(1, Math.min(5, Number(rating) || 1)),
      message: String(message),
      status: "PENDING",
    });

    return res.status(201).json({ message: "Review submitted", data: entry });
  } catch (error) {
    return res.status(500).json({ message: "Failed to submit review" });
  }
};
