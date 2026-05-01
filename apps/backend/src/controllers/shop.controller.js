const Shop = require("../models/shop.model");
const User = require("../models/user.model");
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const ShopLocation = require("../models/shopLocation.model");
const CreditSale = require("../modules/credit-engine/creditSale.model");
const CustomerComplaint = require("../models/customerComplaint.model");
const { buildShopRatings, buildShopDistances } = require("../services/search/search.metrics");
const { createAudit } = require("../utils/audit.util");
const jwt = require("jsonwebtoken");
const { t } =
  require('@/core/infrastructure');
const agentService = require("../modules/agent/agent.service");
const { getOrSet, bumpNamespace } = require("../infrastructure/cache/versioned-cache.service");
const { resolveShopTheme } = require("../utils/theme.util");
const { listCuratedMarketplaceThemes } = require("../utils/theme-marketplace.util");

async function invalidateShopCaches() {
  await Promise.all([
    bumpNamespace("public-shops"),
    bumpNamespace("search"),
  ]);
}

function normalizePhoneDigits(value) {
  return String(value || "").replace(/\D/g, "") || null;
}



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
      acquisitionSource:
        req.body.agentCode || req.body.ref || req.query.ref
          ? "agent"
          : (req.body.acquisitionSource || "organic"),
    });

    await User.findByIdAndUpdate(
      req.user._id,
      { shopId: shop._id }
    );

    const agentCode = req.body.agentCode || req.body.ref || req.query.ref || null;
    if (agentCode) {
      await agentService.attachAgentToShop({
        shopId: shop._id,
        agentCode,
      });
    }

    req.user.shopId = shop._id;
    await req.user.save();
    await invalidateShopCaches();

    await createAudit({
      action: "CREATE_SHOP",
      performedBy: req.user._id,
      targetType: "Shop",
      targetId: shop._id,
      req
    });

    res.status(201).json({
      success: true,
      shop: await Shop.findById(shop._id).lean(),
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
exports.listPublicShops = async (req, res) => {
  try {
    const {
      category,
      distance,
      rating,
      lat,
      lng,
      limit,
    } = req.query || {};
    const normalizedLat = lat != null ? Number(lat) : null;
    const normalizedLng = lng != null ? Number(lng) : null;
    const maxDistance = distance != null ? Number(distance) : null;
    const minRating = rating != null ? Number(rating) : null;
    const safeLimit = Math.min(200, Math.max(1, Number(limit || 100)));
    const filter = { isActive: true, status: "ACTIVE" };

    const cached = await getOrSet({
      namespace: "public-shops",
      key: {
        scope: "public-shops",
        query: req.query,
      },
      ttlSeconds: category || rating || distance ? 45 : 120,
      resolver: async () => {
        if (category) {
          const shopIds = await Product.distinct("shopId", { category: String(category) });
          if (!shopIds.length) {
            return { data: [] };
          }
          filter._id = { $in: shopIds };
        }

        const shops = await Shop.find(filter)
          .select("name domain slug trustScore popularityScore city country logoUrl themeId themeConfig themeOverrides themeExperiment brandPrimaryColor brandAccentColor")
          .limit(safeLimit)
          .lean();

        if (!shops.length) {
          return { data: [] };
        }

        const shopIds = shops.map((shop) => shop._id);
        const [locations, ratingsMap, distanceMap, categoryRows] = await Promise.all([
          ShopLocation.find({ shopId: { $in: shopIds }, isActive: true })
            .sort({ createdAt: 1 })
            .lean(),
          buildShopRatings(shopIds),
          buildShopDistances(shopIds.map((id) => String(id)), normalizedLat, normalizedLng),
          Product.aggregate([
            { $match: { shopId: { $in: shopIds }, category: { $nin: [null, ""] } } },
            { $group: { _id: { shopId: "$shopId", category: "$category" }, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ]),
        ]);

        const primaryLocationMap = new Map();
        locations.forEach((location) => {
          const key = String(location.shopId || "");
          if (!key || primaryLocationMap.has(key)) return;
          primaryLocationMap.set(key, location);
        });
        const categoryMap = new Map();
        categoryRows.forEach((row) => {
          const key = String(row?._id?.shopId || "");
          if (!key || categoryMap.has(key)) return;
          categoryMap.set(key, String(row?._id?.category || ""));
        });

        const curatedThemes = await listCuratedMarketplaceThemes();
        let data = shops.map((shop) => {
          const location = primaryLocationMap.get(String(shop._id || ""));
          const coords = location?.coordinates?.coordinates || [];
          const ratings = ratingsMap.get(String(shop._id || "")) || { avgRating: 0, count: 0 };
          const distanceKm = distanceMap.get(String(shop._id || "")) ?? null;

          return {
            _id: shop._id,
            id: shop._id,
            shopId: shop._id,
            name: shop.name,
            domain: shop.domain || null,
            slug: shop.slug || null,
            city: shop.city || location?.city || null,
            country: shop.country || location?.country || null,
            lat: coords.length >= 2 ? Number(coords[1]) : null,
            lng: coords.length >= 2 ? Number(coords[0]) : null,
            locationName: location?.name || null,
            category: categoryMap.get(String(shop._id || "")) || null,
            ratingAverage: Number(ratings.avgRating || 0),
            ratingCount: Number(ratings.count || 0),
            distanceKm,
            trustScore: Number(shop.trustScore || 0),
            popularityScore: Number(shop.popularityScore || 0),
            isTrending: Number(shop.popularityScore || 0) >= 10,
            logoUrl: shop.logoUrl || null,
            theme: resolveShopTheme(shop, curatedThemes),
            themeExperiment: shop.themeExperiment || null,
          };
        });

        data = data.filter((shop) => shop.lat != null && shop.lng != null);
        if (minRating != null) {
          data = data.filter((shop) => Number(shop.ratingAverage || 0) >= minRating);
        }
        if (maxDistance != null) {
          data = data.filter((shop) => shop.distanceKm != null && Number(shop.distanceKm) <= maxDistance);
        }

        data.sort((a, b) => {
          const scoreA =
            (a.distanceKm == null ? 0 : 100 - Math.min(100, Number(a.distanceKm) * 5)) +
            Number(a.ratingAverage || 0) * 10 +
            Number(a.popularityScore || 0) * 0.2;
          const scoreB =
            (b.distanceKm == null ? 0 : 100 - Math.min(100, Number(b.distanceKm) * 5)) +
            Number(b.ratingAverage || 0) * 10 +
            Number(b.popularityScore || 0) * 0.2;
          return scoreB - scoreA;
        });

        return { data };
      },
    });

    res.json(cached.value);
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
    const queryText = String(req.query?.q || "").trim();
    if (!shopId) {
      return res.status(400).json({ message: "Shop context required" });
    }

    const orderCustomerIds = await Order.distinct("customerId", { shopId });
    const customerFilter = {
      role: "CUSTOMER",
      $or: [{ shopId }, { _id: { $in: orderCustomerIds.filter(Boolean) } }],
    };
    if (queryText) {
      customerFilter.$and = [
        {
          $or: [
            { name: { $regex: queryText, $options: "i" } },
            { phone: { $regex: queryText, $options: "i" } },
            { email: { $regex: queryText, $options: "i" } },
            { globalCustomerId: { $regex: queryText, $options: "i" } },
          ],
        },
      ];
    }

    const customers = await User.find(customerFilter)
      .select("name email phone createdAt globalCustomerId isBlocked")
      .lean();

    const customerIds = customers.map((customer) => customer._id).filter(Boolean);
    const globalCustomerIds = customers.map((customer) => customer.globalCustomerId).filter(Boolean);
    const orderStats = await Order.aggregate([
      { $match: { shopId, customerId: { $in: customerIds } } },
      {
        $group: {
          _id: "$customerId",
          orderCount: { $sum: 1 },
          totalSpend: { $sum: "$totalAmount" },
        },
      },
    ]);

    const channelStats = await Order.aggregate([
      { $match: { shopId, customerId: { $in: customerIds } } },
      {
        $group: {
          _id: { user: "$customerId", channel: "$channel" },
          totalSpend: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 },
        },
      },
    ]);

    const dueStats = await CreditSale.aggregate([
      { $match: { shopId, customerId: { $in: globalCustomerIds } } },
      {
        $group: {
          _id: "$customerId",
          totalDue: { $sum: "$outstandingAmount" },
          creditSales: { $sum: 1 },
        },
      },
    ]);

    const statsMap = new Map(
      orderStats.map((row) => [String(row._id), { orderCount: row.orderCount, totalSpend: row.totalSpend }])
    );
    const dueMap = new Map(
      dueStats.map((row) => [String(row._id), { totalDue: row.totalDue, creditSales: row.creditSales }])
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
      const due = dueMap.get(String(customer.globalCustomerId || "")) || { totalDue: 0, creditSales: 0 };
      return {
        ...customer,
        orderCount: stats.orderCount,
        totalSpend: stats.totalSpend,
        spendByChannel,
        totalDue: due.totalDue,
        creditSales: due.creditSales,
        isBlocked: Boolean(customer.isBlocked),
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

exports.createCustomer = async (req, res) => {
  try {
    const shopId = req.shop?._id || req.user?.shopId;
    if (!shopId) {
      return res.status(400).json({ message: "Shop context required" });
    }

    const name = String(req.body?.name || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!phone) {
      return res.status(400).json({ message: "Phone is required" });
    }

    const existing = await User.findOne({
      role: "CUSTOMER",
      $or: [
        { normalizedPhone: normalizePhoneDigits(phone) },
        ...(email ? [{ email }] : []),
      ],
    });

    if (existing) {
      if (!existing.shopId) {
        existing.shopId = shopId;
        await existing.save();
      }
      return res.json({
        message: "Customer already exists",
        data: {
          _id: existing._id,
          name: existing.name,
          email: existing.email,
          phone: existing.phone,
          globalCustomerId: existing.globalCustomerId,
        },
      });
    }

    const customer = await User.create({
      name: name || `Customer ${phone.slice(-4)}`,
      email: email || `customer-${Date.now()}-${phone.replace(/\D/g, "")}@dokanx.local`,
      phone,
      password: `Temp#${Date.now()}`,
      role: "CUSTOMER",
      shopId,
    });

    return res.status(201).json({
      message: "Customer created",
      data: {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        globalCustomerId: customer.globalCustomerId,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create customer",
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
    await invalidateShopCaches();

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
  await invalidateShopCaches();

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


exports.blockCustomerForMe = async (req, res) => {
  const shopId = req.shop?._id || req.user?.shopId;
  const { userId } = req.params;
  if (!shopId) return res.status(400).json({ message: "Shop context required" });
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "Customer not found" });
  user.isBlocked = true;
  await user.save();
  res.json({ message: "Customer blocked", data: { _id: user._id, isBlocked: true } });
};

exports.unblockCustomer = async (req, res) => {
  const shopId = req.shop?._id || req.user?.shopId;
  const { userId } = req.params;
  if (!shopId) return res.status(400).json({ message: "Shop context required" });
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "Customer not found" });
  user.isBlocked = false;
  await user.save();
  res.json({ message: "Customer unblocked", data: { _id: user._id, isBlocked: false } });
};

exports.listCustomerComplaints = async (req, res) => {
  const shopId = req.shop?._id || req.user?.shopId;
  if (!shopId) return res.status(400).json({ message: "Shop context required" });
  const complaints = await CustomerComplaint.find({ shopId }).sort({ createdAt: -1 }).lean();
  res.json({ data: complaints });
};

exports.createCustomerComplaint = async (req, res) => {
  const shopId = req.shop?._id || req.user?.shopId;
  const { customerId, globalCustomerId, title, detail, channel } = req.body || {};
  if (!shopId) return res.status(400).json({ message: "Shop context required" });
  if (!customerId || !title) return res.status(400).json({ message: "customerId and title required" });
  const complaint = await CustomerComplaint.create({ shopId, customerId, globalCustomerId: globalCustomerId || "", title, detail: detail || "", channel: channel || "STORE", createdBy: req.user?._id || null });
  res.status(201).json({ data: complaint });
};

exports.updateCustomerComplaint = async (req, res) => {
  const shopId = req.shop?._id || req.user?.shopId;
  const { complaintId } = req.params;
  if (!shopId) return res.status(400).json({ message: "Shop context required" });
  const updates = {};
  if (req.body?.status !== undefined) updates.status = req.body.status;
  if (req.body?.detail !== undefined) updates.detail = req.body.detail;
  const complaint = await CustomerComplaint.findOneAndUpdate({ _id: complaintId, shopId }, updates, { returnDocument: "after" });
  if (!complaint) return res.status(404).json({ message: "Complaint not found" });
  res.json({ data: complaint });
};

