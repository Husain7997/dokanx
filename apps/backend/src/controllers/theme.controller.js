const Shop = require("../models/shop.model");
const {
  getThemeCatalog,
  normalizeThemeConfig,
  resolveShopTheme,
  buildResolvedTheme,
  DEFAULT_THEME_ID,
  getThemeEditorCapabilities,
  serializeCustomThemeDefinition,
  validateThemeAccess,
} = require("../utils/theme.util");
const { listCuratedMarketplaceThemes } = require("../utils/theme-marketplace.util");

const THEME_HISTORY_LIMIT = 20;
const THEME_MEDIA_LIMIT = 24;

async function resolveShop(req) {
  if (req.shop) return req.shop;
  if (req.user?.shopId) {
    return Shop.findById(req.user.shopId);
  }
  return null;
}

function formatDiffValue(value) {
  if (value == null || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "On" : "Off";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function buildThemeDiffSummary(previousConfig = null, nextConfig = null) {
  const before = previousConfig && typeof previousConfig === "object" ? previousConfig : {};
  const after = nextConfig && typeof nextConfig === "object" ? nextConfig : {};
  const changes = [];

  const colorFields = ["primary", "secondary", "background", "surface", "text", "buttonText"];
  colorFields.forEach((field) => {
    const beforeValue = before?.colors?.[field];
    const afterValue = after?.colors?.[field];
    if (beforeValue !== afterValue) {
      changes.push({
        key: `colors.${field}`,
        label: `${field} color`,
        before: formatDiffValue(beforeValue),
        after: formatDiffValue(afterValue),
      });
    }
  });

  const typographyFields = [
    ["typography.fontFamily", "font family", before?.typography?.fontFamily, after?.typography?.fontFamily],
    ["typography.headingStyle", "heading style", before?.typography?.headingStyle, after?.typography?.headingStyle],
    ["layout.productListStyle", "product list", before?.layout?.productListStyle, after?.layout?.productListStyle],
    ["layout.productColumns", "product columns", before?.layout?.productColumns, after?.layout?.productColumns],
    ["layout.headerStyle", "header style", before?.layout?.headerStyle, after?.layout?.headerStyle],
    ["layout.footerStyle", "footer style", before?.layout?.footerStyle, after?.layout?.footerStyle],
    ["layout.spacing", "spacing", before?.layout?.spacing, after?.layout?.spacing],
    ["components.productCard", "product card", before?.components?.productCard, after?.components?.productCard],
  ];

  typographyFields.forEach(([key, label, beforeValue, afterValue]) => {
    if (beforeValue !== afterValue) {
      changes.push({
        key,
        label,
        before: formatDiffValue(beforeValue),
        after: formatDiffValue(afterValue),
      });
    }
  });

  const beforeSections = Array.isArray(before?.homepageSections) ? before.homepageSections : [];
  const afterSections = Array.isArray(after?.homepageSections) ? after.homepageSections : [];
  const beforeOrder = beforeSections.map((section) => String(section?.type || "")).filter(Boolean).join(" > ");
  const afterOrder = afterSections.map((section) => String(section?.type || "")).filter(Boolean).join(" > ");
  if (beforeOrder !== afterOrder) {
    changes.push({
      key: "homepageSections.order",
      label: "section order",
      before: formatDiffValue(beforeOrder),
      after: formatDiffValue(afterOrder),
    });
  }

  const sectionTypes = Array.from(
    new Set([...beforeSections.map((section) => String(section?.type || "")), ...afterSections.map((section) => String(section?.type || ""))])
  ).filter(Boolean);

  sectionTypes.forEach((type) => {
    const beforeSection = beforeSections.find((section) => String(section?.type || "") === type) || null;
    const afterSection = afterSections.find((section) => String(section?.type || "") === type) || null;
    const beforeEnabled = beforeSection?.enabled !== false;
    const afterEnabled = afterSection?.enabled !== false;
    if (beforeEnabled !== afterEnabled) {
      changes.push({
        key: `homepageSections.${type}.enabled`,
        label: `${type} visibility`,
        before: beforeEnabled ? "Visible" : "Hidden",
        after: afterEnabled ? "Visible" : "Hidden",
      });
    }
    if (String(beforeSection?.title || "") !== String(afterSection?.title || "")) {
      changes.push({
        key: `homepageSections.${type}.title`,
        label: `${type} title`,
        before: formatDiffValue(beforeSection?.title),
        after: formatDiffValue(afterSection?.title),
      });
    }
  });

  return changes;
}

function resolveSnapshotVersionLabel(themeId, shop) {
  const theme = Array.isArray(shop?.customThemes)
    ? shop.customThemes.find((entry) => String(entry.themeId || "") === String(themeId || ""))
    : null;
  if (theme?.version) {
    return `v${String(theme.version)}`;
  }
  if (themeId) {
    return String(themeId);
  }
  return DEFAULT_THEME_ID;
}

function serializeThemeHistory(shop, curatedThemes = []) {
  if (!Array.isArray(shop?.themeHistory)) {
    return [];
  }

  const sorted = [...shop.themeHistory].sort(
    (left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()
  );

  return sorted.map((entry, index) => {
    const previousEntry = sorted[index + 1] || null;
    const diffSummary = buildThemeDiffSummary(previousEntry?.config || null, entry?.config || null);
    return {
      snapshotId: entry.snapshotId,
      themeId: entry.themeId,
      config: entry.config || null,
      mode: entry.mode || "publish",
      sourceSnapshotId: entry.sourceSnapshotId || null,
      actorName: entry.actorName || "",
      actorRole: entry.actorRole || "",
      createdAt: entry.createdAt || null,
      versionLabel: resolveSnapshotVersionLabel(entry.themeId, shop),
      changeCount: diffSummary.length,
      diffSummary: diffSummary.slice(0, 8),
      preview: buildResolvedTheme(entry.themeId || DEFAULT_THEME_ID, entry.config || {}, shop?.customThemes || [], curatedThemes),
    };
  });
}

function pushThemeSnapshot(shop, snapshot) {
  const history = Array.isArray(shop.themeHistory) ? [...shop.themeHistory] : [];
  history.unshift(snapshot);
  shop.themeHistory = history.slice(0, THEME_HISTORY_LIMIT);
}

function createThemeSnapshot({
  themeId,
  config,
  mode = "publish",
  actor,
  sourceSnapshotId = null,
  createdAt = new Date(),
  catalogThemes = [],
}) {
  return {
    snapshotId: String(new Shop()._id),
    themeId: String(themeId || DEFAULT_THEME_ID),
    config: normalizeThemeConfig(config || {}, themeId || DEFAULT_THEME_ID, catalogThemes),
    mode,
    sourceSnapshotId,
    actorName: actor?.name || actor?.email || "",
    actorRole: actor?.role || "",
    createdAt,
  };
}

function serializeThemeAssets(shop) {
  return Array.isArray(shop?.themeAssets)
    ? [...shop.themeAssets]
        .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
        .map((asset) => ({
          assetId: asset.assetId,
          name: asset.name || "",
          type: asset.type || "image",
          dataUrl: asset.dataUrl || "",
          alt: asset.alt || "",
          tags: Array.isArray(asset.tags) ? asset.tags.map((item) => String(item)) : [],
          createdAt: asset.createdAt || null,
        }))
    : [];
}

function serializeCustomThemes(shop) {
  return Array.isArray(shop?.customThemes)
    ? shop.customThemes.map((theme) => serializeCustomThemeDefinition(theme)).filter(Boolean)
    : [];
}

async function resolveCuratedThemes() {
  return listCuratedMarketplaceThemes();
}

async function buildCatalog(shop) {
  const curatedThemes = await resolveCuratedThemes();
  return {
    curatedThemes,
    catalog: getThemeCatalog(shop?.customThemes || [], curatedThemes),
  };
}

function serializeMarketplace(shop) {
  const source = shop?.themeMarketplace && typeof shop.themeMarketplace === "object" ? shop.themeMarketplace : {};
  const installedThemeIds = Array.isArray(source.installedThemeIds)
    ? Array.from(new Set(source.installedThemeIds.map((item) => String(item || "")).filter(Boolean)))
    : [];
  const favoriteThemeIds = Array.isArray(source.favoriteThemeIds)
    ? Array.from(new Set(source.favoriteThemeIds.map((item) => String(item || "")).filter(Boolean)))
    : [];

  if (!installedThemeIds.includes(DEFAULT_THEME_ID)) {
    installedThemeIds.unshift(DEFAULT_THEME_ID);
  }

  return {
    installedThemeIds,
    favoriteThemeIds,
  };
}

function serializeThemeExperiment(shop, curatedThemes = []) {
  const source = shop?.themeExperiment && typeof shop.themeExperiment === "object" ? shop.themeExperiment : {};
  const variants = Array.isArray(source.variants)
    ? source.variants
        .map((variant, index) => {
          const themeId = String(variant?.themeId || "").trim();
          if (!themeId) return null;
          const config = normalizeThemeConfig(variant?.config || {}, themeId, [
            ...(shop?.customThemes || []),
            ...curatedThemes,
          ]);
          return {
            id: String(variant?.id || (index === 0 ? "A" : "B")).toUpperCase(),
            label: String(variant?.label || `Variant ${index === 0 ? "A" : "B"}`),
            themeId,
            config,
          };
        })
        .filter(Boolean)
    : [];

  return {
    isEnabled: source.isEnabled === true && variants.length >= 2,
    experimentId: String(source.experimentId || ""),
    name: String(source.name || ""),
    trafficSplit: Math.max(10, Math.min(90, Number(source.trafficSplit || 50))),
    variants,
  };
}

function bumpThemeVersion(version) {
  const parts = String(version || "1.0.0")
    .split(".")
    .map((item) => Number(item));
  const major = Number.isFinite(parts[0]) ? parts[0] : 1;
  const minor = Number.isFinite(parts[1]) ? parts[1] : 0;
  const patch = Number.isFinite(parts[2]) ? parts[2] : 0;
  return `${major}.${minor}.${patch + 1}`;
}

exports.listThemes = async (_, res) => {
  const curatedThemes = await resolveCuratedThemes();
  res.json({ data: getThemeCatalog([], curatedThemes) });
};

async function resolveShopByMerchantId(merchantId) {
  if (!merchantId) return null;
  return Shop.findById(merchantId);
}

exports.getTheme = async (req, res) => {
  const shop = req.params?.merchantId ? await resolveShopByMerchantId(req.params.merchantId) : await resolveShop(req);
  if (!shop) return res.status(404).json({ message: "Shop not found" });
  const curatedThemes = await resolveCuratedThemes();
  res.json({ data: resolveShopTheme(shop, curatedThemes) });
};

exports.getThemeDraft = async (req, res) => {
  const shop = await resolveShop(req);
  if (!shop) return res.status(404).json({ message: "Shop not found" });
  const { curatedThemes, catalog } = await buildCatalog(shop);
  const draft = shop.themeDraftConfig
    ? buildResolvedTheme(shop.themeId || DEFAULT_THEME_ID, shop.themeDraftConfig, shop.customThemes || [], curatedThemes)
    : null;
  const access = getThemeEditorCapabilities(shop.merchantTier);
  res.json({
    data: {
      draft,
      published: resolveShopTheme(shop, curatedThemes),
      draftUpdatedAt: shop.themeDraftUpdatedAt || null,
      publishedAt: shop.themePublishedAt || null,
      history: serializeThemeHistory(shop, curatedThemes),
      access,
      mediaAssets: serializeThemeAssets(shop),
      customThemes: serializeCustomThemes(shop),
      catalog,
      marketplace: serializeMarketplace(shop),
      experiment: serializeThemeExperiment(shop, curatedThemes),
    },
  });
};

exports.getThemeHistory = async (req, res) => {
  const shop = await resolveShop(req);
  if (!shop) return res.status(404).json({ message: "Shop not found" });
  const curatedThemes = await resolveCuratedThemes();
  res.json({
    data: {
      history: serializeThemeHistory(shop, curatedThemes),
      publishedAt: shop.themePublishedAt || null,
      experiment: serializeThemeExperiment(shop, curatedThemes),
    },
  });
};

exports.getThemeMedia = async (req, res) => {
  const shop = await resolveShop(req);
  if (!shop) return res.status(404).json({ message: "Shop not found" });

  res.json({
    data: {
      assets: serializeThemeAssets(shop),
      access: getThemeEditorCapabilities(shop.merchantTier),
    },
  });
};

exports.getCustomThemes = async (req, res) => {
  const shop = await resolveShop(req);
  if (!shop) return res.status(404).json({ message: "Shop not found" });
  const { catalog } = await buildCatalog(shop);

  res.json({
    data: {
      themes: serializeCustomThemes(shop),
      access: getThemeEditorCapabilities(shop.merchantTier),
      catalog,
    },
  });
};

exports.exportCustomTheme = async (req, res) => {
  const shop = await resolveShop(req);
  if (!shop) return res.status(404).json({ message: "Shop not found" });

  const themeId = String(req.params?.themeId || "");
  const theme = Array.isArray(shop.customThemes)
    ? shop.customThemes.find((entry) => String(entry.themeId) === themeId)
    : null;

  if (!theme) {
    return res.status(404).json({ message: "Custom theme not found" });
  }

  const serialized = serializeCustomThemeDefinition(theme);
  res.json({
    data: {
      theme: {
        themeId: serialized.id,
        name: serialized.name,
        category: serialized.category,
        preview: serialized.preview,
        version: serialized.version,
        versionNotes: serialized.versionNotes,
        config: serialized.config,
      },
    },
  });
};

exports.installMarketplaceTheme = async (req, res) => {
  const shop = await resolveShop(req);
  if (!shop) return res.status(404).json({ message: "Shop not found" });

  const themeId = String(req.body?.themeId || "");
  if (!themeId) {
    return res.status(400).json({ message: "themeId is required" });
  }

  const { curatedThemes, catalog } = await buildCatalog(shop);
  const selectedTheme = catalog.find((theme) => String(theme.id) === themeId);
  if (!selectedTheme) {
    return res.status(404).json({ message: "Theme not found in marketplace" });
  }

  const access = validateThemeAccess(shop.merchantTier, themeId, selectedTheme.config || {}, [
    ...(shop.customThemes || []),
    ...curatedThemes,
  ]);
  if (!access.allowed) {
    return res.status(403).json({
      message: access.violations[0] || "This theme requires a higher plan.",
      data: { access: access.capabilities, violations: access.violations },
    });
  }

  const marketplace = serializeMarketplace(shop);
  if (!marketplace.installedThemeIds.includes(themeId)) {
    marketplace.installedThemeIds.push(themeId);
  }
  shop.themeMarketplace = marketplace;
  await shop.save();

  res.json({
    message: "Theme installed",
    data: {
      marketplace: serializeMarketplace(shop),
      catalog,
      access: access.capabilities,
    },
  });
};

exports.toggleFavoriteTheme = async (req, res) => {
  const shop = await resolveShop(req);
  if (!shop) return res.status(404).json({ message: "Shop not found" });

  const themeId = String(req.body?.themeId || "");
  if (!themeId) {
    return res.status(400).json({ message: "themeId is required" });
  }

  const { catalog } = await buildCatalog(shop);
  const exists = catalog.some((theme) => String(theme.id) === themeId);
  if (!exists) {
    return res.status(404).json({ message: "Theme not found in marketplace" });
  }

  const marketplace = serializeMarketplace(shop);
  if (marketplace.favoriteThemeIds.includes(themeId)) {
    marketplace.favoriteThemeIds = marketplace.favoriteThemeIds.filter((item) => item !== themeId);
  } else {
    marketplace.favoriteThemeIds.unshift(themeId);
  }
  shop.themeMarketplace = marketplace;
  await shop.save();

  res.json({
    message: "Theme favorite updated",
    data: {
      marketplace: serializeMarketplace(shop),
      catalog,
      access: getThemeEditorCapabilities(shop.merchantTier),
    },
  });
};

exports.createCustomTheme = async (req, res) => {
  const shop = await resolveShop(req);
  if (!shop) return res.status(404).json({ message: "Shop not found" });

  const access = getThemeEditorCapabilities(shop.merchantTier);
  if (!access.canUseCustomThemeUpload) {
    return res.status(403).json({
      message: "Custom theme upload is available on the Enterprise plan.",
      data: { access },
    });
  }

  const source = req.body?.theme && typeof req.body.theme === "object" ? req.body.theme : req.body || {};
  const themeId = String(source.themeId || source.id || "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const name = String(source.name || "").trim();
  const preview = String(source.preview || "").trim();
  const category = String(source.category || "custom").trim();
  const requestedVersion = String(source.version || "").trim();
  const versionNotes = String(source.versionNotes || "").trim();
  const config = normalizeThemeConfig(source.config || {}, DEFAULT_THEME_ID);

  if (!themeId || !name) {
    return res.status(400).json({ message: "themeId and name are required for a custom theme." });
  }

  const currentThemes = Array.isArray(shop.customThemes) ? [...shop.customThemes] : [];
  const existingIndex = currentThemes.findIndex((theme) => String(theme.themeId) === themeId);
  const existingTheme = existingIndex >= 0 ? currentThemes[existingIndex] : null;
  const nextVersion = requestedVersion || (existingTheme?.version ? bumpThemeVersion(existingTheme.version) : "1.0.0");
  const nextTheme = {
    themeId,
    name,
    category,
    plan: "ENTERPRISE",
    requiredTier: "PLATINUM",
    preview: preview || "Merchant uploaded custom theme",
    version: nextVersion,
    versionNotes,
    approvalStatus: "PENDING",
    submittedForReviewAt: new Date(),
    approvedAt: null,
    rejectedAt: null,
    rejectionReason: "",
    reviewedByName: "",
    marketplaceStatus: "PRIVATE",
    marketplaceFeatured: false,
    config,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  if (existingIndex >= 0) {
    currentThemes[existingIndex] = {
      ...currentThemes[existingIndex],
      ...nextTheme,
      createdAt: currentThemes[existingIndex].createdAt || nextTheme.createdAt,
      updatedAt: new Date(),
    };
  } else {
    currentThemes.unshift(nextTheme);
  }

  shop.customThemes = currentThemes.slice(0, 12);
  await shop.save();
  const curatedThemes = await resolveCuratedThemes();

  res.status(existingIndex >= 0 ? 200 : 201).json({
    message: existingIndex >= 0 ? "Custom theme updated" : "Custom theme uploaded",
    data: {
      themes: serializeCustomThemes(shop),
      catalog: getThemeCatalog(shop.customThemes || [], curatedThemes),
      access,
    },
  });
};

exports.deleteCustomTheme = async (req, res) => {
  const shop = await resolveShop(req);
  if (!shop) return res.status(404).json({ message: "Shop not found" });

  const access = getThemeEditorCapabilities(shop.merchantTier);
  if (!access.canUseCustomThemeUpload) {
    return res.status(403).json({
      message: "Custom theme upload is available on the Enterprise plan.",
      data: { access },
    });
  }

  const themeId = String(req.params?.themeId || "");
  const currentThemes = Array.isArray(shop.customThemes) ? [...shop.customThemes] : [];
  const exists = currentThemes.some((theme) => String(theme.themeId) === themeId);
  if (!exists) {
    return res.status(404).json({ message: "Custom theme not found" });
  }
  if (String(shop.themeId || "") === themeId) {
    return res.status(409).json({ message: "Switch away from this custom theme before deleting it." });
  }

  shop.customThemes = currentThemes.filter((theme) => String(theme.themeId) !== themeId);
  await shop.save();
  const curatedThemes = await resolveCuratedThemes();

  res.json({
    message: "Custom theme removed",
    data: {
      themes: serializeCustomThemes(shop),
      catalog: getThemeCatalog(shop.customThemes || [], curatedThemes),
      access,
    },
  });
};

exports.createThemeMedia = async (req, res) => {
  const shop = await resolveShop(req);
  if (!shop) return res.status(404).json({ message: "Shop not found" });

  const access = getThemeEditorCapabilities(shop.merchantTier);
  if (!access.canUploadHeroMedia) {
    return res.status(403).json({
      message: "Theme media library is available on the Pro plan.",
      data: { access },
    });
  }

  const name = String(req.body?.name || "").trim();
  const dataUrl = String(req.body?.dataUrl || "").trim();
  const alt = String(req.body?.alt || "").trim();
  const tags = Array.isArray(req.body?.tags) ? req.body.tags.map((item) => String(item || "").trim()).filter(Boolean) : [];

  if (!dataUrl.startsWith("data:image/")) {
    return res.status(400).json({ message: "A valid image dataUrl is required." });
  }

  const nextAsset = {
    assetId: String(new Shop()._id),
    name: name || `Theme asset ${Date.now()}`,
    type: "image",
    dataUrl,
    alt,
    tags,
    createdAt: new Date(),
  };

  const assets = Array.isArray(shop.themeAssets) ? [...shop.themeAssets] : [];
  assets.unshift(nextAsset);
  shop.themeAssets = assets.slice(0, THEME_MEDIA_LIMIT);
  await shop.save();

  res.status(201).json({
    message: "Theme media saved",
    data: {
      asset: nextAsset,
      assets: serializeThemeAssets(shop),
      access,
    },
  });
};

exports.deleteThemeMedia = async (req, res) => {
  const shop = await resolveShop(req);
  if (!shop) return res.status(404).json({ message: "Shop not found" });

  const access = getThemeEditorCapabilities(shop.merchantTier);
  if (!access.canUploadHeroMedia) {
    return res.status(403).json({
      message: "Theme media library is available on the Pro plan.",
      data: { access },
    });
  }

  const assetId = String(req.params?.assetId || "");
  const currentAssets = Array.isArray(shop.themeAssets) ? shop.themeAssets : [];
  const exists = currentAssets.some((asset) => String(asset.assetId) === assetId);
  if (!exists) {
    return res.status(404).json({ message: "Theme asset not found" });
  }

  shop.themeAssets = currentAssets.filter((asset) => String(asset.assetId) !== assetId);
  await shop.save();

  res.json({
    message: "Theme media removed",
    data: {
      assets: serializeThemeAssets(shop),
      access,
    },
  });
};

exports.updateTheme = async (req, res) => {
  const shop = await resolveShop(req);
  if (!shop) return res.status(404).json({ message: "Shop not found" });

  const { themeId, themeConfig, overrides, mode } = req.body || {};
  if (!themeId) return res.status(400).json({ message: "themeId is required" });

  const resolvedThemeId = String(themeId || DEFAULT_THEME_ID);
  const curatedThemes = await resolveCuratedThemes();
  const nextConfig = normalizeThemeConfig(themeConfig || overrides || {}, resolvedThemeId, [
    ...(shop.customThemes || []),
    ...curatedThemes,
  ]);
  const access = validateThemeAccess(shop.merchantTier, resolvedThemeId, nextConfig, [
    ...(shop.customThemes || []),
    ...curatedThemes,
  ]);
  if (!access.allowed) {
    return res.status(403).json({
      message: access.violations[0] || "Theme customization is not available on your current plan.",
      data: {
        access: access.capabilities,
        violations: access.violations,
      },
    });
  }

  shop.themeId = resolvedThemeId;
  const normalizedMode = String(mode || "publish").toLowerCase();
  if (normalizedMode === "draft") {
    shop.themeDraftConfig = nextConfig;
    shop.themeDraftUpdatedAt = new Date();
  } else {
    const publishedAt = new Date();
    shop.themeConfig = nextConfig;
    shop.themeOverrides = nextConfig;
    shop.themeDraftConfig = nextConfig;
    shop.themeDraftUpdatedAt = publishedAt;
    shop.themePublishedAt = publishedAt;
    pushThemeSnapshot(
      shop,
      createThemeSnapshot({
        themeId: resolvedThemeId,
        config: nextConfig,
        mode: "publish",
        actor: req.user,
        createdAt: publishedAt,
        catalogThemes: [...(shop.customThemes || []), ...curatedThemes],
      })
    );
  }
  await shop.save();

  res.json({
    message: normalizedMode === "draft" ? "Theme draft saved" : "Theme updated",
    data: {
      draft: buildResolvedTheme(shop.themeId || DEFAULT_THEME_ID, shop.themeDraftConfig || nextConfig, shop.customThemes || [], curatedThemes),
      published: resolveShopTheme(shop, curatedThemes),
      draftUpdatedAt: shop.themeDraftUpdatedAt || null,
      publishedAt: shop.themePublishedAt || null,
      history: serializeThemeHistory(shop, curatedThemes),
      access: access.capabilities,
      mediaAssets: serializeThemeAssets(shop),
      customThemes: serializeCustomThemes(shop),
      catalog: getThemeCatalog(shop.customThemes || [], curatedThemes),
      marketplace: serializeMarketplace(shop),
      experiment: serializeThemeExperiment(shop, curatedThemes),
    },
  });
};

exports.applyTheme = exports.updateTheme;

exports.rollbackTheme = async (req, res) => {
  const shop = await resolveShop(req);
  if (!shop) return res.status(404).json({ message: "Shop not found" });

  const snapshotId = String(req.body?.snapshotId || "");
  const snapshot = Array.isArray(shop.themeHistory)
    ? shop.themeHistory.find((entry) => String(entry.snapshotId) === snapshotId)
    : null;

  if (!snapshot) {
    return res.status(404).json({ message: "Theme snapshot not found" });
  }

  const nextThemeId = String(snapshot.themeId || DEFAULT_THEME_ID);
  const curatedThemes = await resolveCuratedThemes();
  const nextConfig = normalizeThemeConfig(snapshot.config || {}, nextThemeId, [
    ...(shop.customThemes || []),
    ...curatedThemes,
  ]);
  const access = validateThemeAccess(shop.merchantTier, nextThemeId, nextConfig, [
    ...(shop.customThemes || []),
    ...curatedThemes,
  ]);
  if (!access.allowed) {
    return res.status(403).json({
      message: access.violations[0] || "This snapshot requires a higher plan.",
      data: {
        access: access.capabilities,
        violations: access.violations,
      },
    });
  }
  const rolledBackAt = new Date();

  shop.themeId = nextThemeId;
  shop.themeConfig = nextConfig;
  shop.themeOverrides = nextConfig;
  shop.themeDraftConfig = nextConfig;
  shop.themeDraftUpdatedAt = rolledBackAt;
  shop.themePublishedAt = rolledBackAt;
  pushThemeSnapshot(
    shop,
    createThemeSnapshot({
      themeId: nextThemeId,
      config: nextConfig,
      mode: "rollback",
      actor: req.user,
      sourceSnapshotId: snapshotId,
      createdAt: rolledBackAt,
      catalogThemes: [...(shop.customThemes || []), ...curatedThemes],
    })
  );

  await shop.save();

  res.json({
    message: "Theme rolled back",
    data: {
      draft: buildResolvedTheme(shop.themeId || DEFAULT_THEME_ID, shop.themeDraftConfig || nextConfig, shop.customThemes || [], curatedThemes),
      published: resolveShopTheme(shop, curatedThemes),
      draftUpdatedAt: shop.themeDraftUpdatedAt || null,
      publishedAt: shop.themePublishedAt || null,
      history: serializeThemeHistory(shop, curatedThemes),
      access: access.capabilities,
      mediaAssets: serializeThemeAssets(shop),
      customThemes: serializeCustomThemes(shop),
      catalog: getThemeCatalog(shop.customThemes || [], curatedThemes),
      marketplace: serializeMarketplace(shop),
      experiment: serializeThemeExperiment(shop, curatedThemes),
    },
  });
};

exports.updateThemeExperiment = async (req, res) => {
  const shop = await resolveShop(req);
  if (!shop) return res.status(404).json({ message: "Shop not found" });

  const curatedThemes = await resolveCuratedThemes();
  const source = req.body?.experiment && typeof req.body.experiment === "object" ? req.body.experiment : req.body || {};
  const variants = Array.isArray(source.variants) ? source.variants.slice(0, 2) : [];

  const normalizedVariants = variants
    .map((variant, index) => {
      const themeId = String(variant?.themeId || "").trim();
      if (!themeId) return null;
      const config = normalizeThemeConfig(variant?.config || shop.themeConfig || {}, themeId, [
        ...(shop.customThemes || []),
        ...curatedThemes,
      ]);
      const access = validateThemeAccess(shop.merchantTier, themeId, config, [
        ...(shop.customThemes || []),
        ...curatedThemes,
      ]);
      if (!access.allowed) {
        throw new Error(access.violations[0] || `Variant ${index + 1} is not available on this plan.`);
      }
      return {
        id: String(variant?.id || (index === 0 ? "A" : "B")).toUpperCase(),
        label: String(variant?.label || `Variant ${index === 0 ? "A" : "B"}`),
        themeId,
        config,
      };
    })
    .filter(Boolean);

  if (source.isEnabled === true && normalizedVariants.length < 2) {
    return res.status(400).json({ message: "At least two variants are required to enable a theme experiment." });
  }

  shop.themeExperiment = {
    isEnabled: source.isEnabled === true,
    experimentId: String(source.experimentId || source.name || `exp-${Date.now()}`),
    name: String(source.name || "Homepage theme experiment"),
    trafficSplit: Math.max(10, Math.min(90, Number(source.trafficSplit || 50))),
    variants: normalizedVariants,
  };
  await shop.save();

  return res.json({
    message: "Theme experiment updated",
    data: {
      experiment: serializeThemeExperiment(shop, curatedThemes),
      catalog: getThemeCatalog(shop.customThemes || [], curatedThemes),
    },
  });
};

exports.resetTheme = async (req, res) => {
  const shop = await resolveShop(req);
  if (!shop) return res.status(404).json({ message: "Shop not found" });

  shop.themeId = DEFAULT_THEME_ID;
  shop.themeConfig = null;
  shop.themeDraftConfig = null;
  shop.themeOverrides = null;
  await shop.save();

  const curatedThemes = await resolveCuratedThemes();
  res.json({ message: "Theme reset", data: resolveShopTheme(shop, curatedThemes) });
};
