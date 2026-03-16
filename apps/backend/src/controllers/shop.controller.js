const Shop = require("../models/shop.model");
const User = require("../models/user.model");
const Order = require("../models/order.model");
const { createAudit } = require("../utils/audit.util");
const jwt = require("jsonwebtoken");
const { t } =
  require('@/core/infrastructure');



exports.createShop = async (req, res) => {
  try {

    if (req.user.shopId) {
      return res.status(400).json({
        success: false,
        message: "User already owns a shop",
      });
    }

    const shop = await Shop.create({
      name: req.body.name,
      currency: req.body.currency,
      timezone: req.body.timezone,
      locale: req.body.locale,
      owner: req.user._id,
      isActive: true,
    });
await User.findByIdAndUpdate(
  req.user._id,
  { shopId: shop._id }
);
res.status(201).json({
  success: true,
  shop
});
    req.user.shopId = shop._id;
    await req.user.save();

    await createAudit({
      action: "CREATE_SHOP",
      performedBy: req.user._id,
      targetType: "Shop",
      targetId: shop._id,
      req
    });

    res.status(201).json({
      success: true,
      shop,
    });

  } catch (err) {
    console.error("CREATE SHOP ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  res.json({
    message: "Order status updated (stub)",
    orderId: id,
    status
  });
};
/**
 * GET MY SHOPS
 */
exports.getMyShops = async (req, res) => {
  try {
    let shops = [];
    if (req.user?.role === "STAFF" && req.user?.shopId) {
      const staffShop = await Shop.findById(req.user.shopId);
      shops = staffShop ? [staffShop] : [];
    } else {
      shops = await Shop.find({ owner: req.user._id });
    }

    res.json({
      message: t('common.updated', req.lang),
      data: shops,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch shops",
    });
  }
};

/**
 * LIST PUBLIC SHOPS
 */
exports.listPublicShops = async (_req, res) => {
  try {
    const shops = await Shop.find({ isActive: true, status: "ACTIVE" })
      .select("name domain slug")
      .lean();

    res.json({
      data: shops,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch shops",
    });
  }
};

exports.listCustomers = async (req, res) => {
  try {
    const shopId = req.shop?._id || req.user?.shopId;
    if (!shopId) {
      return res.status(400).json({ message: "Shop context required" });
    }

    const customers = await User.find({ role: "CUSTOMER", shopId })
      .select("name email phone createdAt")
      .lean();

    const customerIds = customers.map((customer) => customer._id).filter(Boolean);
    const orderStats = await Order.aggregate([
      { $match: { shopId, user: { $in: customerIds } } },
      {
        $group: {
          _id: "$user",
          orderCount: { $sum: 1 },
          totalSpend: { $sum: "$totalAmount" },
        },
      },
    ]);

    const channelStats = await Order.aggregate([
      { $match: { shopId, user: { $in: customerIds } } },
      {
        $group: {
          _id: { user: "$user", channel: "$channel" },
          totalSpend: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 },
        },
      },
    ]);

    const statsMap = new Map(
      orderStats.map((row) => [String(row._id), { orderCount: row.orderCount, totalSpend: row.totalSpend }])
    );

    const channelMap = new Map();
    for (const row of channelStats) {
      const userId = String(row._id.user);
      const channel = String(row._id.channel || "WEB");
      if (!channelMap.has(userId)) {
        channelMap.set(userId, {});
      }
      channelMap.get(userId)[channel] = {
        orderCount: row.orderCount,
        totalSpend: row.totalSpend,
      };
    }

    const enriched = customers.map((customer) => {
      const stats = statsMap.get(String(customer._id)) || { orderCount: 0, totalSpend: 0 };
      const spendByChannel = channelMap.get(String(customer._id)) || {};
      return {
        ...customer,
        orderCount: stats.orderCount,
        totalSpend: stats.totalSpend,
        spendByChannel,
      };
    });

    res.json({
      message: t("common.updated", req.lang),
      data: enriched,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
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

    await createAudit({
      action: "APPROVE_SHOP",
      performedBy: req.user._id,
      targetType: "Shop",
      targetId: shop._id,
      req
    });
   
    shop.isActive = true;
    await shop.save();

    res.json({
      message: t('common.updated', req.lang),
    
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Shop approve failed",
    });
  }
   
};

exports.suspendShop = async (req, res) => {
  const shop = await Shop.findById(req.params.id);

  if (!shop) {
    return res.status(404).json({ message: "Shop not found" });
  }
  
  shop.isActive = false;
  await shop.save();

  res.json({
    message: t('common.updated', req.lang),
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

exports.blockCustomer = async (req, res) => {
  const { shopId, userId } = req.params;

  const shop = await Shop.findById(shopId);
  if (!shop) {
    return res.status(404).json({ success: false, message: "Shop not found" });
  }

  // owner ownership check
  if (shop.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Not your shop" });
  }

  const user = await User.findById(userId);
  // const t = req.t;

if (!user)
  return res.status(400).json({
    msg: t("USER_NOT_FOUND"),
  });

  user.isBlocked = true;
  await user.save();

  await createAudit({
    performedBy: req.user._id,
    action: "BLOCK_CUSTOMER",
    targetType: "User",
    targetId: user._id,
    req
  });

  res.json({ message: t('common.updated', req.lang), message: "Customer blocked" });
};
