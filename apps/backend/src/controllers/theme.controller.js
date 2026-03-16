const Shop = require("../models/shop.model");

const themes = [
  { id: "merchant-theme", name: "Merchant Core", category: "default" },
  { id: "vibrant-market", name: "Vibrant Market", category: "bold" },
  { id: "clean-minimal", name: "Clean Minimal", category: "minimal" },
];

async function resolveShop(req) {
  if (req.shop) return req.shop;
  if (req.user?.shopId) {
    return Shop.findById(req.user.shopId);
  }
  return null;
}

exports.listThemes = async (_, res) => {
  res.json({ data: themes });
};

exports.applyTheme = async (req, res) => {
  const shop = await resolveShop(req);
  if (!shop) return res.status(404).json({ message: "Shop not found" });

  const { themeId, overrides } = req.body || {};
  if (!themeId) return res.status(400).json({ message: "themeId is required" });

  shop.themeId = String(themeId);
  shop.themeOverrides = overrides || null;
  await shop.save();

  res.json({ message: "Theme applied", data: { themeId: shop.themeId } });
};

exports.resetTheme = async (req, res) => {
  const shop = await resolveShop(req);
  if (!shop) return res.status(404).json({ message: "Shop not found" });

  shop.themeId = null;
  shop.themeOverrides = null;
  await shop.save();

  res.json({ message: "Theme reset" });
};
