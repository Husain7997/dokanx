const crypto = require("crypto");
const Cart = require("@/models/cart.model");
const Product = require("@/models/product.model");
const marketingService = require("@/modules/marketing/marketing.service");

function newGuestToken() {
  return `cart_${crypto.randomBytes(12).toString("hex")}`;
}

function normalizeQuantity(value) {
  const quantity = Number(value);
  return Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 0;
}

function buildSelector({ shopId, userId = null, guestToken = null }) {
  if (!shopId) throw new Error("shopId is required");
  if (userId) return { shopId, userId };
  if (guestToken) return { shopId, guestToken };
  throw new Error("userId or guestToken is required");
}

async function getProductsForCart(shopId, items = []) {
  const ids = items.map(item => item.productId).filter(Boolean);
  const products = await Product.find({
    shopId,
    _id: { $in: ids },
    isActive: true,
  }).lean();

  return new Map(products.map(product => [String(product._id), product]));
}

function computeItems(items, productMap) {
  const normalized = [];

  for (const raw of items) {
    const product = productMap.get(String(raw.productId));
    const quantity = normalizeQuantity(raw.quantity);
    if (!product || quantity <= 0) continue;

    normalized.push({
      productId: product._id,
      name: product.name,
      imageUrl: product.imageUrl || "",
      price: Number(product.price || 0),
      quantity,
      lineTotal: Number(product.price || 0) * quantity,
    });
  }

  const totals = normalized.reduce(
    (acc, item) => {
      acc.itemCount += 1;
      acc.quantity += item.quantity;
      acc.subtotal += item.lineTotal;
      return acc;
    },
    { itemCount: 0, quantity: 0, subtotal: 0 }
  );

  totals.discountTotal = 0;
  totals.grandTotal = totals.subtotal;
  return { items: normalized, totals };
}

async function getCart({ shopId, userId = null, guestToken = null }) {
  if (!userId && !guestToken) {
    return null;
  }
  const selector = buildSelector({ shopId, userId, guestToken });
  return Cart.findOne(selector).lean();
}

async function saveCart({ shopId, userId = null, guestToken = null, items = [] }) {
  const resolvedGuestToken = userId ? null : guestToken || newGuestToken();
  const selector = buildSelector({ shopId, userId, guestToken: resolvedGuestToken });
  const productMap = await getProductsForCart(shopId, items);
  const computed = computeItems(items, productMap);

  return Cart.findOneAndUpdate(
    selector,
    {
      $set: {
        shopId,
        userId: userId || null,
        guestToken: resolvedGuestToken,
        items: computed.items,
        totals: computed.totals,
        appliedCoupon: {
          code: "",
          type: "",
          discountValue: 0,
          appliedAt: null,
        },
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  ).lean();
}

async function clearCart({ shopId, userId = null, guestToken = null }) {
  const selector = buildSelector({ shopId, userId, guestToken });
  await Cart.deleteOne(selector);
}

async function mergeGuestCart({ shopId, userId, guestToken }) {
  if (!userId || !guestToken) {
    throw new Error("userId and guestToken are required");
  }

  const [guestCart, userCart] = await Promise.all([
    Cart.findOne({ shopId, guestToken }).lean(),
    Cart.findOne({ shopId, userId }).lean(),
  ]);

  const mergedMap = new Map();
  for (const item of userCart?.items || []) {
    mergedMap.set(String(item.productId), {
      productId: String(item.productId),
      quantity: item.quantity,
    });
  }
  for (const item of guestCart?.items || []) {
    const key = String(item.productId);
    const existing = mergedMap.get(key);
    mergedMap.set(key, {
      productId: key,
      quantity: (existing?.quantity || 0) + item.quantity,
    });
  }

  const merged = await saveCart({
    shopId,
    userId,
    items: Array.from(mergedMap.values()),
  });

  await Cart.deleteOne({ shopId, guestToken });
  return merged;
}

async function applyCouponToCart({ shopId, userId = null, guestToken = null, code, shippingFee = 0 }) {
  const selector = buildSelector({ shopId, userId, guestToken });
  const cart = await Cart.findOne(selector);
  if (!cart) {
    const err = new Error("Cart not found");
    err.statusCode = 404;
    throw err;
  }

  const result = await marketingService.evaluateCoupon({
    shopId,
    code,
    cartSubtotal: cart.totals?.subtotal || 0,
    shippingFee,
    itemCount: cart.totals?.quantity || 0,
  });

  if (!result.valid) {
    const err = new Error(result.reason || "Coupon invalid");
    err.statusCode = 400;
    throw err;
  }

  cart.appliedCoupon = {
    code: result.coupon.code,
    type: result.coupon.type,
    discountValue: Number(result.effect.discountValue || 0),
    appliedAt: new Date(),
  };
  cart.totals.discountTotal = Number(result.effect.discountValue || 0);
  cart.totals.grandTotal = Math.max(
    0,
    Number(cart.totals.subtotal || 0) - Number(cart.totals.discountTotal || 0)
  );
  await cart.save();
  return cart.toObject ? cart.toObject() : cart;
}

async function removeCouponFromCart({ shopId, userId = null, guestToken = null }) {
  const selector = buildSelector({ shopId, userId, guestToken });
  const cart = await Cart.findOne(selector);
  if (!cart) {
    const err = new Error("Cart not found");
    err.statusCode = 404;
    throw err;
  }

  cart.appliedCoupon = {
    code: "",
    type: "",
    discountValue: 0,
    appliedAt: null,
  };
  cart.totals.discountTotal = 0;
  cart.totals.grandTotal = Number(cart.totals.subtotal || 0);
  await cart.save();
  return cart.toObject ? cart.toObject() : cart;
}

module.exports = {
  newGuestToken,
  getCart,
  saveCart,
  clearCart,
  mergeGuestCart,
  applyCouponToCart,
  removeCouponFromCart,
};
