const Shop = require("../models/shop.model");

/**
 * CREATE SHOP (Admin / Owner)
 */
exports.createShop = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Shop name is required",
      });
    }

    const shop = await Shop.create({
      name,
      description,
      owner: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: shop,
    });
  } catch (error) {
    console.error("CREATE SHOP ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Shop create failed",
    });
  }
};

/**
 * GET MY SHOPS
 */
exports.getMyShops = async (req, res) => {
  try {
    const shops = await Shop.find({ owner: req.user._id });

    res.json({
      success: true,
      data: shops,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch shops",
    });
  }
};
exports.approveShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }
   
    shop.isActive = true;
    await shop.save();

    res.json({
      success: true,
      message: "Shop approved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Shop approve failed",
    });
  }
   await createAudit({
      action: "APPROVE_SHOP",
      performedBy: req.user._id,
      targetType: "Shop",
      targetId: shop._id,
      req
    });
};

exports.suspendShop = async (req, res) => {
  const shop = await Shop.findById(req.params.id);

  if (!shop) {
    return res.status(404).json({ message: "Shop not found" });
  }
  
  shop.isActive = false;
  await shop.save();

  res.json({
    success: true,
    message: "Shop suspended"
  });
  await createAudit({
    action: "SUSPEND_SHOP",
    performedBy: req.user._id,
    targetType: "Shop",
    targetId: shop._id,
    req
  });
};
