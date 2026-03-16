const Product = require("../models/product.model");
const Inventory = require("../models/Inventory.model");
const { createAudit } = require("../utils/audit.util");
const { t } =
  require('@/core/infrastructure');

// exports.createProduct = async (req, res) => {

//   if (!req.shop)
//     return res.status(400).json({
//       message: "Tenant shop missing"
//     });

//   const { name, price, description, stock = 0 } = req.body;

//   const product = await Product.create({
//     name,
//     price,
//     description,
//     shopId: req.shop._id,
//     owner: req.user._id,
//   });

//   const inventory = await Inventory.create({
//     shopId: req.shop._id,
//     product: product._id,
//     stock,
//     reserved: 0,
//     status: stock > 0 ? "IN_STOCK" : "OUT_OF_STOCK"
//   });

//   await createAudit({
//     action: "CREATE_PRODUCT",
//     performedBy: req.user._id,
//     targetType: "Product",
//     targetId: product._id,
//     req
//   });

//   res.status(201).json({
//     message: t("common.created", req.lang),
//     product,
//     inventory
//   });
// };

exports.createProduct = async (req, res) => {
  try {

    if (!req.shop) {
      return res.status(404).json({
        success:false,
        message:"Shop not found"
      });
    }

    const { name, price, stock } = req.body;

    /* =====================
       1️⃣ CREATE PRODUCT
    ===================== */

    const product = await Product.create({
      name,
      price,
      barcode: barcode || null,
      shopId: req.shop._id,
      owner: req.user._id
    });

    /* =====================
       2️⃣ CREATE INVENTORY
    ===================== */

    const inventory = await Inventory.create({
      shopId: req.shop._id,
      product: product._id,
      stock: Number(stock)||0,
      reserved: 0,
      inventoryVersion: 0,
      isActive: true,
      isReconciling: false
    });

    /* =====================
       3️⃣ RESPONSE
    ===================== */

    res.status(201).json({
      success:true,
      product,
      inventory
    });

  } catch (err) {
    console.error("CREATE PRODUCT ERROR:", err);

    res.status(500).json({
      success:false,
      message:"Product creation failed"
    });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    if (!req.shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    const { productId } = req.params;
    const { name, price, stock, barcode } = req.body;

    const product = await Product.findOne({ _id: productId, shopId: req.shop._id });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (typeof name === "string" && name.trim()) {
      product.name = name.trim();
    }
    if (typeof price === "number") {
      product.price = price;
    }
    if (typeof barcode === "string" && barcode.trim()) {
      product.barcode = barcode.trim();
    }
    if (typeof stock === "number") {
      product.stock = Math.max(0, stock);
    }

    await product.save();

    if (typeof stock === "number") {
      await Inventory.updateOne(
        { shopId: req.shop._id, product: product._id },
        { $set: { stock: Math.max(0, stock) } }
      );
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (err) {
    console.error("UPDATE PRODUCT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Product update failed",
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    if (!req.shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    const { productId } = req.params;
    const product = await Product.findOne({ _id: productId, shopId: req.shop._id });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.isActive = false;
    await product.save();

    await Inventory.updateOne(
      { shopId: req.shop._id, product: product._id },
      { $set: { isActive: false } }
    );

    return res.status(200).json({
      success: true,
      message: "Product archived",
    });
  } catch (err) {
    console.error("DELETE PRODUCT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Product archive failed",
    });
  }
};
exports.getProductsByShop = async (req, res) => {
  try {
    const { shopId } = req.params;
    const exists = await Product.findOne({
      name: req.body.name,
      shopId: req.shop._id
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Product already exists in this shop",
      });
    }

    const products = await Product.find({ shopId: shopId });

    res.status(200).json({
      message: t('common.updated', req.lang),
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
};



exports.getProductInventory = async (req, res) => {

  const inventory = await Inventory.findOne({
    shopId: req.shop._id,
    product: req.params.productId
  });

  if (!inventory)
    return res.status(404).json({
      message: "Inventory not found"
    });

  res.json({
    available: inventory.stock,
    reserved: inventory.reserved
  });
};

exports.getProductByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    const shopId = req.query.shopId || req.shop?._id;
    if (!barcode || !shopId) {
      return res.status(400).json({ message: "barcode and shopId required" });
    }

    const product = await Product.findOne({ shopId, barcode });
    if (!product) return res.status(404).json({ message: "Product not found" });

    return res.json({ data: product });
  } catch (err) {
    return res.status(500).json({ message: "Barcode lookup failed" });
  }
};
