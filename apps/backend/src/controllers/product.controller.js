const Product = require("../models/product.model");
const Shop = require("../models/shop.model");
const { createAudit } = require("../utils/audit.util");
const Inventory = require('../models/Inventory.model');
const InventoryTransaction = require("../models/inventoryTransaction.model");
exports.createProduct = async (req, res) => {
  try {
    const { name, price, description, stock, shop } = req.body;
    const initialStock = Number(req.body.stock ?? 0);

    if (initialStock < 0) {
      return res.status(400).json({
        message: "Stock cannot be negative"
      });
    }
    if (!req.shop || !req.shop._id) {
      return res.status(400).json({
        success: false,
        message: "Shop is required",
      });
    }

    const foundShop = await Shop.findById(shop);

    if (!foundShop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    if (!foundShop.isActive) {
      return res.status(403).json({
        success: false,
        message: "Shop is not approved yet",
      });
    }

    if (!name || !price) {
      return res.status(400).json({
        success: false,
        message: "Product name and price are required",
      });
    }

    const product = await Product.create({
      name,
      price,
      description,
      stock,
      shop,
      owner: req.user._id,
    });
    // Initialize inventory for the product
   // ✅ Auto create inventory for product
const inventory = await Inventory.create({
  shop: product.shop,
  product: product._id,
  stock: initialStock,
  reserved: 0,
  status: initialStock > 0 ? "IN_STOCK" : "OUT_OF_STOCK"
});

// ✅ Inventory transaction log
await InventoryTransaction.create({
  shop: product.shop,
  product: product._id,
  type: "INVENTORY_CREATED",
  quantity: initialStock,
  note: "Initial stock on product creation"
});

    await createAudit({
      action: "CREATE_PRODUCT",
      user: req.user ? req.user._id : null,
    });
    res.status(201).json({
      success: true,
      data: product,
      inventory,
    });
  } catch (error) {
  console.error("PRODUCT CREATE ERROR:", error);
  return res.status(500).json({
    success: false,
    message: error.message
  });
}

};



exports.getProductsByShop = async (req, res) => {
  try {
    const { shopId } = req.params;
    const exists = await Product.findOne({
      name: req.body.name,
      shop: req.shop._id
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Product already exists in this shop",
      });
    }

    const products = await Product.find({ shop: shopId });

    res.status(200).json({
      success: true,
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