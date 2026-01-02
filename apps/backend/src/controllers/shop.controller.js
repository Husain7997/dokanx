const Shop = require("../models/shop.model");

exports.createShop = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name)
      return res.status(400).json({ message: "Shop name required" });

    const slug = name.toLowerCase().replace(/\s+/g, "-");

    const exists = await Shop.findOne({ slug });
    if (exists)
      return res.status(400).json({ message: "Shop already exists" });

    const shop = await Shop.create({
      name,
      slug,
      owner: req.user.userId,
    });

    res.status(201).json(shop);
  } catch (err) {
    next(err);
  }
};
