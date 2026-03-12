const response = require("@/utils/controllerResponse");
const service = require("./theme.service");

function resolveShopId(req) {
  return req.shop?._id || req.user?.shopId || null;
}

exports.listThemes = async (req, res, next) => {
  try {
    const rows = await service.listThemes({
      includeInactive: String(req.query.includeInactive) === "true",
    });
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
};

exports.createTheme = async (req, res, next) => {
  try {
    const row = await service.createTheme(req.body);
    return response.success(res, { data: row }, 201);
  } catch (err) {
    return next(err);
  }
};

exports.updateTheme = async (req, res) => {
  try {
    const row = await service.updateTheme(req.params.themeId, req.body);
    return response.updated(res, req, row);
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.deleteTheme = async (req, res) => {
  try {
    await service.deleteTheme(req.params.themeId);
    return res.json({ success: true, message: "Theme removed" });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.applyTheme = async (req, res) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);
    const row = await service.applyThemeToShop({
      shopId,
      themeId: req.body.themeId,
      overrides: req.body.overrides || {},
    });
    return response.updated(res, req, row);
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.resetTheme = async (req, res) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);
    const row = await service.resetShopTheme(shopId);
    return response.updated(res, req, row);
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.previewTheme = async (req, res) => {
  try {
    const shopId = resolveShopId(req);
    const row = await service.previewTheme({
      shopId,
      themeId: req.body.themeId,
      overrides: req.body.overrides || {},
    });
    return response.updated(res, req, row);
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};
