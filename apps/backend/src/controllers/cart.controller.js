const jwt = require("jsonwebtoken");
const Cart = require("../models/cart.model");
const Product = require("../models/product.model");
const { randomToken } = require("../utils/crypto.util");

function computeTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  return {
    subtotal,
    quantity,
    itemCount: items.length,
    grandTotal: subtotal,
  };
}

async function resolveUser(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.id || null;
  } catch {
    return null;
  }
}

function resolveGuestToken(req) {
  const headerToken = req.headers["x-cart-token"];
  if (headerToken) return String(headerToken);
  return `guest_${randomToken(12)}`;
}

async function resolveShopId(req) {
  const shopId = req.query.shopId || req.body?.shopId || req.shop?._id || req.tenant?._id;
  return shopId ? String(shopId) : null;
}

exports.getCart = async (req, res) => {
  const shopId = await resolveShopId(req);
  if (!shopId) return res.status(400).json({ message: "shopId required" });

  const userId = await resolveUser(req);
  const guestToken = userId ? null : resolveGuestToken(req);

  const cart = await Cart.findOne({
    shopId,
    ...(userId ? { userId } : { guestToken }),
  }).lean();

  res.json({ data: cart || null, guestToken });
};

exports.saveCart = async (req, res) => {
  const shopId = await resolveShopId(req);
  if (!shopId) return res.status(400).json({ message: "shopId required" });

  const userId = await resolveUser(req);
  const guestToken = userId ? null : resolveGuestToken(req);

  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const productIds = items.map((item) => item.productId).filter(Boolean);

  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const productMap = new Map(products.map((product) => [String(product._id), product]));

  const normalizedItems = items.map((item) => {
    const product = productMap.get(String(item.productId));
    return {
      productId: item.productId,
      name: product?.name || item.name || "",
      price: Number(product?.price ?? item.price ?? 0),
      quantity: Math.max(1, Number(item.quantity) || 1),
      imageUrl: product?.image || item.imageUrl || "",
    };
  });

  const totals = computeTotals(normalizedItems);

  const cart = await Cart.findOneAndUpdate(
    {
      shopId,
      ...(userId ? { userId } : { guestToken }),
    },
    {
      shopId,
      userId,
      guestToken,
      items: normalizedItems,
      totals,
    },
    { new: true, upsert: true }
  );

  res.json({ data: cart, guestToken });
};

exports.clearCart = async (req, res) => {
  const shopId = await resolveShopId(req);
  if (!shopId) return res.status(400).json({ message: "shopId required" });

  const userId = await resolveUser(req);
  const guestToken = userId ? null : resolveGuestToken(req);

  await Cart.findOneAndDelete({
    shopId,
    ...(userId ? { userId } : { guestToken }),
  });

  res.json({ message: "Cart cleared", guestToken });
};

exports.mergeCart = async (req, res) => {
  const shopId = await resolveShopId(req);
  if (!shopId) return res.status(400).json({ message: "shopId required" });

  const userId = await resolveUser(req);
  if (!userId) return res.status(401).json({ message: "Login required to merge carts" });

  const guestToken = resolveGuestToken(req);
  const guestCart = await Cart.findOne({ shopId, guestToken });
  if (!guestCart) return res.json({ message: "No guest cart to merge" });

  const userCart = await Cart.findOne({ shopId, userId });

  const merged = new Map();
  const allItems = [...(userCart?.items || []), ...(guestCart.items || [])];
  for (const item of allItems) {
    const key = String(item.productId);
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      merged.set(key, { ...item.toObject?.() ?? item });
    }
  }

  const mergedItems = Array.from(merged.values());
  const totals = computeTotals(mergedItems);

  const nextCart = await Cart.findOneAndUpdate(
    { shopId, userId },
    {
      shopId,
      userId,
      items: mergedItems,
      totals,
      guestToken: null,
    },
    { new: true, upsert: true }
  );

  await Cart.deleteOne({ _id: guestCart._id });

  res.json({ message: "Cart merged", data: nextCart });
};

exports.applyCoupon = async (req, res) => {
  const shopId = await resolveShopId(req);
  if (!shopId) return res.status(400).json({ message: "shopId required" });
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ message: "Coupon code required" });

  res.json({ message: "Coupon applied", data: { code } });
};

exports.removeCoupon = async (req, res) => {
  const shopId = await resolveShopId(req);
  if (!shopId) return res.status(400).json({ message: "shopId required" });
  res.json({ message: "Coupon removed" });
};
