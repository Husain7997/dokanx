const Shop = require("@/models/shop.model");
const ShopTheme = require("./models/shopTheme.model");

const PRESET_THEMES = [
  { name: "Pharmacy", slug: "pharmacy", category: "PHARMACY", tokens: { primaryColor: "#0EA5E9", secondaryColor: "#E0F2FE", accentColor: "#0369A1", fontFamily: "Inter", borderRadius: "ROUNDED", spacing: "BALANCED" } },
  { name: "Fashion", slug: "fashion", category: "FASHION", tokens: { primaryColor: "#EC4899", secondaryColor: "#111827", accentColor: "#FBCFE8", fontFamily: "Playfair Display", borderRadius: "PILL", spacing: "SPACIOUS" } },
  { name: "Grocery", slug: "grocery", category: "GROCERY", tokens: { primaryColor: "#22C55E", secondaryColor: "#052E16", accentColor: "#86EFAC", fontFamily: "Poppins", borderRadius: "ROUNDED", spacing: "BALANCED" } },
  { name: "Electronics", slug: "electronics", category: "ELECTRONICS", tokens: { primaryColor: "#6366F1", secondaryColor: "#111827", accentColor: "#A5B4FC", fontFamily: "Roboto", borderRadius: "SHARP", spacing: "COMPACT" } },
  { name: "Restaurant", slug: "restaurant", category: "RESTAURANT", tokens: { primaryColor: "#F97316", secondaryColor: "#431407", accentColor: "#FDBA74", fontFamily: "Nunito", borderRadius: "ROUNDED", spacing: "SPACIOUS" } },
  { name: "Jewelry", slug: "jewelry", category: "JEWELRY", tokens: { primaryColor: "#D4AF37", secondaryColor: "#1C1917", accentColor: "#FDE68A", fontFamily: "Cormorant", borderRadius: "PILL", spacing: "SPACIOUS" } },
  { name: "Bookstore", slug: "bookstore", category: "BOOKSTORE", tokens: { primaryColor: "#92400E", secondaryColor: "#F5F5F4", accentColor: "#D6D3D1", fontFamily: "Merriweather", borderRadius: "SHARP", spacing: "BALANCED" } },
  { name: "Hardware", slug: "hardware", category: "HARDWARE", tokens: { primaryColor: "#475569", secondaryColor: "#0F172A", accentColor: "#94A3B8", fontFamily: "Work Sans", borderRadius: "SHARP", spacing: "COMPACT" } },
];

function mergeTheme(theme, overrides = {}) {
  return {
    ...theme,
    tokens: {
      ...(theme?.tokens || {}),
      ...(overrides?.tokens || {}),
    },
    assets: {
      ...(theme?.assets || {}),
      ...(overrides?.assets || {}),
    },
    metadata: {
      ...(theme?.metadata || {}),
      ...(overrides?.metadata || {}),
    },
  };
}

async function ensurePresetThemes() {
  const existing = await ShopTheme.find({ isPreset: true }).lean();
  if (existing.length >= PRESET_THEMES.length) {
    return existing;
  }

  const existingSlugs = new Set(existing.map(item => item.slug));
  const missing = PRESET_THEMES.filter(item => !existingSlugs.has(item.slug));
  if (missing.length) {
    await ShopTheme.insertMany(
      missing.map(item => ({
        ...item,
        isPreset: true,
        isActive: true,
      }))
    );
  }

  return ShopTheme.find({ isPreset: true }).lean();
}

async function listThemes({ includeInactive = false } = {}) {
  await ensurePresetThemes();
  const query = includeInactive ? {} : { isActive: true };
  return ShopTheme.find(query).sort({ isPreset: -1, createdAt: -1 }).lean();
}

async function createTheme(payload) {
  return ShopTheme.create({
    name: String(payload.name || "").trim(),
    slug: String(payload.slug || "").trim().toLowerCase(),
    category: String(payload.category || "CUSTOM").trim().toUpperCase(),
    isPreset: false,
    isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
    tokens: payload.tokens || {},
    assets: payload.assets || {},
    metadata: payload.metadata || {},
  });
}

async function updateTheme(themeId, payload) {
  const theme = await ShopTheme.findById(themeId);
  if (!theme) {
    const err = new Error("Theme not found");
    err.statusCode = 404;
    throw err;
  }

  if (payload.name !== undefined) theme.name = String(payload.name || "").trim();
  if (payload.slug !== undefined) theme.slug = String(payload.slug || "").trim().toLowerCase();
  if (payload.category !== undefined) theme.category = String(payload.category || "CUSTOM").trim().toUpperCase();
  if (payload.isActive !== undefined) theme.isActive = Boolean(payload.isActive);
  if (payload.tokens) theme.tokens = { ...(theme.tokens || {}), ...payload.tokens };
  if (payload.assets) theme.assets = { ...(theme.assets || {}), ...payload.assets };
  if (payload.metadata !== undefined) theme.metadata = payload.metadata || {};

  await theme.save();
  return theme;
}

async function deleteTheme(themeId) {
  const theme = await ShopTheme.findById(themeId);
  if (!theme) {
    const err = new Error("Theme not found");
    err.statusCode = 404;
    throw err;
  }

  if (theme.isPreset) {
    const err = new Error("Preset themes cannot be deleted");
    err.statusCode = 400;
    throw err;
  }

  await theme.deleteOne();
  return { success: true };
}

async function applyThemeToShop({ shopId, themeId, overrides = {} }) {
  const [shop, theme] = await Promise.all([
    Shop.findById(shopId),
    ShopTheme.findById(themeId).lean(),
  ]);

  if (!shop) {
    const err = new Error("Shop not found");
    err.statusCode = 404;
    throw err;
  }
  if (!theme) {
    const err = new Error("Theme not found");
    err.statusCode = 404;
    throw err;
  }

  shop.themeRef = theme._id;
  shop.themeOverrides = overrides || {};
  await shop.save();

  return mergeTheme(theme, overrides);
}

async function resetShopTheme(shopId) {
  const shop = await Shop.findById(shopId);
  if (!shop) {
    const err = new Error("Shop not found");
    err.statusCode = 404;
    throw err;
  }

  shop.themeRef = null;
  shop.themeOverrides = {};
  await shop.save();
  return shop;
}

async function previewTheme({ shopId = null, themeId, overrides = {} }) {
  const theme = await ShopTheme.findById(themeId).lean();
  if (!theme) {
    const err = new Error("Theme not found");
    err.statusCode = 404;
    throw err;
  }

  const merged = mergeTheme(theme, overrides);
  return {
    shopId,
    themeId,
    preview: merged,
    cssVariables: {
      "--color-primary": merged.tokens.primaryColor,
      "--color-secondary": merged.tokens.secondaryColor,
      "--color-accent": merged.tokens.accentColor,
      "--font-family": merged.tokens.fontFamily,
      "--border-radius": merged.tokens.borderRadius,
      "--spacing-mode": merged.tokens.spacing,
    },
  };
}

module.exports = {
  ensurePresetThemes,
  listThemes,
  createTheme,
  updateTheme,
  deleteTheme,
  applyThemeToShop,
  resetShopTheme,
  previewTheme,
};
