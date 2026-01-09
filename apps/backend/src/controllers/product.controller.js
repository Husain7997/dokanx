const Product = require("../models/product.model");
const Shop = require("../models/shop.model");
const { createAudit } = require("../utils/audit.util");
exports.createProduct = async (req, res) => {
  try {
    const { name, price, description, stock, shop } = req.body;

    if (!shop) {
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

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Product create failed",
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