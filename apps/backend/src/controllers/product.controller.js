const Product = require('../models/product.model');

// Create Product
exports.createProduct = async (req, res) => {
  try {
    const { name, price, stock } = req.body;

    if (!name || !price)
      return res.status(400).json({ message: 'Name & price required' });

    const product = await Product.create({
      shop: req.shop._id,
      name,
      price,
      stock
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get Products (Shop-wise)
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find({ shop: req.shop._id });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
