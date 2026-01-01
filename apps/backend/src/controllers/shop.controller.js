const Shop = require("../models/Shop");

exports.createShop = async (req, res) => {
  try {
    const shop = await Shop.create({
      name: req.body.name,
      owner: req.user.userId
    });

    res.status(201).json(shop);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
