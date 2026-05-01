const DEFAULT_THEME_ID = "merchant-theme";
const MERCHANT_TIER_ORDER = {
  STANDARD: 0,
  SILVER: 1,
  GOLD: 2,
  PLATINUM: 3,
};
const PLAN_TIER_REQUIREMENTS = {
  FREE: "STANDARD",
  PRO: "SILVER",
  ENTERPRISE: "PLATINUM",
};

const FONT_MAP = {
  Poppins: "'Poppins', ui-sans-serif, system-ui, sans-serif",
  Sora: "'Sora', ui-sans-serif, system-ui, sans-serif",
  Inter: "'Inter', ui-sans-serif, system-ui, sans-serif",
  Roboto: "'Roboto', ui-sans-serif, system-ui, sans-serif",
  Fraunces: "'Fraunces', Georgia, serif",
};

const SECTION_IDS = ["hero", "featuredProducts", "categories", "offers", "testimonials"];

const DEFAULT_SECTION_LIBRARY = {
  hero: {
    type: "hero",
    enabled: true,
    title: "Merchant-controlled storefront experience",
    subtitle: "Colors, layout, cards, and sections are all driven by saved config.",
    ctaLabel: "Shop now",
    ctaLink: "/products",
    config: {
      imageUrl: "",
      imageAlt: "",
      heroLayout: "split",
      mediaFit: "cover",
    },
    style: "accent",
  },
  featuredProducts: {
    type: "featuredProducts",
    enabled: true,
    title: "Recommendations",
    subtitle: "Products blended from order history, live search, and your location context.",
    ctaLabel: "View all",
    ctaLink: "/products",
    config: {
      productCollection: "recommended",
      maxItems: 12,
      productColumns: 4,
    },
    style: "default",
  },
  categories: {
    type: "categories",
    enabled: true,
    title: "Shops near you",
    subtitle: "Use filters to narrow district, thana, market, and shop.",
    ctaLabel: "Explore shops",
    ctaLink: "/shops",
    style: "minimal",
  },
  offers: {
    type: "offers",
    enabled: true,
    title: "Flash deals",
    subtitle: "Fast-moving offers near your current district and market selection.",
    ctaLabel: "See offers",
    ctaLink: "/products",
    config: {
      productCollection: "flash",
      maxItems: 8,
      productColumns: 3,
    },
    style: "accent",
  },
  testimonials: {
    type: "testimonials",
    enabled: false,
    title: "Popular shops",
    subtitle: "High-trust stores customers around you revisit frequently.",
    ctaLabel: "Browse trusted shops",
    ctaLink: "/shops",
    style: "default",
  },
};

const THEME_LIBRARY = {
  "merchant-theme": {
    id: "merchant-theme",
    name: "Merchant Core",
    category: "default",
    plan: "FREE",
    requiredTier: "STANDARD",
    preview: "Balanced storefront for most shops",
    config: {
      colors: {
        primary: "#0B1E3C",
        secondary: "#FF7A00",
        background: "#F8FAFC",
        surface: "#FFFFFF",
        text: "#10233D",
        buttonText: "#FFFFFF",
      },
      typography: {
        fontFamily: "Poppins",
        headingStyle: "balanced",
      },
      layout: {
        productListStyle: "grid",
        productColumns: 4,
        headerStyle: "centered",
        footerStyle: "classic",
        spacing: "comfortable",
      },
      components: {
        productCard: "modern",
      },
      sections: {
        hero: true,
        featuredProducts: true,
        categories: true,
        offers: true,
        testimonials: false,
      },
      sectionOrder: SECTION_IDS,
      homepageSections: SECTION_IDS.map((id) => ({ id, ...DEFAULT_SECTION_LIBRARY[id] })),
    },
  },
  "vibrant-market": {
    id: "vibrant-market",
    name: "Vibrant Market",
    category: "bold",
    plan: "PRO",
    requiredTier: "SILVER",
    preview: "High-energy retail layout for promotions",
    config: {
      colors: {
        primary: "#A61E4D",
        secondary: "#FFB703",
        background: "#FFF9F2",
        surface: "#FFFFFF",
        text: "#2A0F1D",
        buttonText: "#FFFFFF",
      },
      typography: {
        fontFamily: "Sora",
        headingStyle: "impact",
      },
      layout: {
        productListStyle: "grid",
        productColumns: 3,
        headerStyle: "left",
        footerStyle: "stacked",
        spacing: "spacious",
      },
      components: {
        productCard: "detailed",
      },
      sections: {
        hero: true,
        featuredProducts: true,
        categories: true,
        offers: true,
        testimonials: true,
      },
      sectionOrder: ["hero", "offers", "featuredProducts", "categories", "testimonials"],
      homepageSections: [
        { id: "hero", ...DEFAULT_SECTION_LIBRARY.hero, title: "Big launch week for your storefront" },
        { id: "offers", ...DEFAULT_SECTION_LIBRARY.offers },
        { id: "featuredProducts", ...DEFAULT_SECTION_LIBRARY.featuredProducts, title: "Trending now" },
        { id: "categories", ...DEFAULT_SECTION_LIBRARY.categories },
        { id: "testimonials", ...DEFAULT_SECTION_LIBRARY.testimonials, enabled: true },
      ],
    },
  },
  "clean-minimal": {
    id: "clean-minimal",
    name: "Clean Minimal",
    category: "minimal",
    plan: "PRO",
    requiredTier: "SILVER",
    preview: "Quiet storefront for premium catalog browsing",
    config: {
      colors: {
        primary: "#111827",
        secondary: "#4B5563",
        background: "#FFFFFF",
        surface: "#F9FAFB",
        text: "#111827",
        buttonText: "#FFFFFF",
      },
      typography: {
        fontFamily: "Inter",
        headingStyle: "minimal",
      },
      layout: {
        productListStyle: "list",
        productColumns: 2,
        headerStyle: "minimal",
        footerStyle: "minimal",
        spacing: "compact",
      },
      components: {
        productCard: "minimal",
      },
      sections: {
        hero: true,
        featuredProducts: true,
        categories: false,
        offers: false,
        testimonials: true,
      },
      sectionOrder: ["hero", "featuredProducts", "testimonials", "categories", "offers"],
      homepageSections: [
        { id: "hero", ...DEFAULT_SECTION_LIBRARY.hero, style: "minimal", ctaLabel: "Browse collection" },
        { id: "featuredProducts", ...DEFAULT_SECTION_LIBRARY.featuredProducts, title: "Curated picks" },
        { id: "testimonials", ...DEFAULT_SECTION_LIBRARY.testimonials, enabled: true },
      ],
    },
  },
};

function serializeCustomThemeDefinition(theme) {
  if (!theme || typeof theme !== "object") return null;
  const themeId = String(theme.themeId || "").trim();
  if (!themeId) return null;
  return {
    id: themeId,
    name: String(theme.name || "Custom Theme"),
    category: String(theme.category || "custom"),
    plan: String(theme.plan || "ENTERPRISE").toUpperCase(),
    requiredTier: String(theme.requiredTier || "PLATINUM").toUpperCase(),
    preview: String(theme.preview || "Merchant uploaded custom theme"),
    version: String(theme.version || "1.0.0"),
    versionNotes: String(theme.versionNotes || ""),
    approvalStatus: String(theme.approvalStatus || "PENDING").toUpperCase(),
    marketplaceStatus: String(theme.marketplaceStatus || "PRIVATE").toUpperCase(),
    marketplaceFeatured: Boolean(theme.marketplaceFeatured),
    config: normalizeThemeConfig(theme.config || {}, DEFAULT_THEME_ID),
    isCustom: true,
  };
}

function uniqueThemeCatalogEntries(items = []) {
  const seen = new Set();
  return items.filter((theme) => {
    const id = String(theme?.id || "");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function deepMerge(base, overrides) {
  if (!overrides || typeof overrides !== "object") {
    return Array.isArray(base) ? [...base] : { ...base };
  }

  const output = Array.isArray(base) ? [...base] : { ...base };
  Object.entries(overrides).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      output[key] = [...value];
      return;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const current = output[key] && typeof output[key] === "object" && !Array.isArray(output[key]) ? output[key] : {};
      output[key] = deepMerge(current, value);
      return;
    }
    output[key] = value;
  });
  return output;
}

function clampColumns(value) {
  const normalized = Number(value || 0);
  if (!Number.isFinite(normalized)) return 4;
  return Math.min(4, Math.max(1, Math.round(normalized)));
}

function normalizeSectionOrder(value, sections) {
  const incoming = Array.isArray(value) ? value.map((item) => String(item || "")).filter(Boolean) : [];
  const valid = incoming.filter((item) => SECTION_IDS.includes(item));
  const missing = SECTION_IDS.filter((item) => !valid.includes(item) && sections[item] !== false);
  const disabled = SECTION_IDS.filter((item) => sections[item] === false && !valid.includes(item));
  return [...valid, ...missing, ...disabled];
}

function sanitizeSection(section, index) {
  const type = SECTION_IDS.includes(String(section?.type || "")) ? String(section.type) : null;
  if (!type) return null;

  const base = DEFAULT_SECTION_LIBRARY[type];
  const config = section?.config && typeof section.config === "object" ? section.config : {};
  return {
    id: String(section?.id || `${type}-${index + 1}`),
    type,
    enabled: section?.enabled !== false,
    title: String(section?.title || base.title),
    subtitle: String(section?.subtitle || base.subtitle),
    ctaLabel: String(section?.ctaLabel || base.ctaLabel || ""),
    ctaLink: String(section?.ctaLink || base.ctaLink || ""),
    config: {
      imageUrl: typeof config.imageUrl === "string" ? config.imageUrl : base.config?.imageUrl || "",
      imageAlt: typeof config.imageAlt === "string" ? config.imageAlt : base.config?.imageAlt || "",
      heroLayout: ["split", "centered", "immersive"].includes(String(config.heroLayout || ""))
        ? String(config.heroLayout)
        : base.config?.heroLayout || "split",
      mediaFit: ["cover", "contain", "soft"].includes(String(config.mediaFit || ""))
        ? String(config.mediaFit)
        : base.config?.mediaFit || "cover",
      productCollection: ["recommended", "featured", "flash", "recent"].includes(String(config.productCollection || ""))
        ? String(config.productCollection)
        : base.config?.productCollection,
      maxItems: Number.isFinite(Number(config.maxItems)) ? Number(config.maxItems) : base.config?.maxItems,
      productColumns: [2, 3, 4].includes(Number(config.productColumns))
        ? Number(config.productColumns)
        : base.config?.productColumns,
    },
    style: ["default", "accent", "minimal"].includes(String(section?.style || ""))
      ? String(section.style)
      : base.style,
  };
}

function buildHomepageSections(inputSections, legacySections, legacyOrder) {
  if (Array.isArray(inputSections) && inputSections.length) {
    return inputSections
      .map((section, index) => sanitizeSection(section, index))
      .filter(Boolean);
  }

  const sections = legacySections || {};
  const order = Array.isArray(legacyOrder) && legacyOrder.length ? legacyOrder : SECTION_IDS;
  return order
    .filter((type) => SECTION_IDS.includes(String(type || "")))
    .map((type, index) =>
      sanitizeSection(
        {
          id: String(type),
          type,
          enabled: sections[type] !== false,
        },
        index
      )
    )
    .filter(Boolean);
}

function normalizeThemeConfig(input = {}, themeId = DEFAULT_THEME_ID, catalogThemes = []) {
  const preset = getThemeDefinition(themeId, catalogThemes, catalogThemes).config;
  const merged = deepMerge(preset, input);
  const homepageSections = buildHomepageSections(merged.homepageSections, merged.sections, merged.sectionOrder);

  const sections = {
    hero: homepageSections.some((section) => section.type === "hero" && section.enabled),
    featuredProducts: homepageSections.some((section) => section.type === "featuredProducts" && section.enabled),
    categories: homepageSections.some((section) => section.type === "categories" && section.enabled),
    offers: homepageSections.some((section) => section.type === "offers" && section.enabled),
    testimonials: homepageSections.some((section) => section.type === "testimonials" && section.enabled),
  };

  return {
    colors: {
      primary: String(merged.colors?.primary || preset.colors.primary),
      secondary: String(merged.colors?.secondary || preset.colors.secondary),
      background: String(merged.colors?.background || preset.colors.background),
      surface: String(merged.colors?.surface || preset.colors.surface),
      text: String(merged.colors?.text || preset.colors.text),
      buttonText: String(merged.colors?.buttonText || preset.colors.buttonText),
    },
    typography: {
      fontFamily: FONT_MAP[merged.typography?.fontFamily] ? String(merged.typography.fontFamily) : preset.typography.fontFamily,
      headingStyle: ["balanced", "impact", "minimal"].includes(String(merged.typography?.headingStyle || ""))
        ? String(merged.typography.headingStyle)
        : preset.typography.headingStyle,
    },
    layout: {
      productListStyle: ["grid", "list"].includes(String(merged.layout?.productListStyle || ""))
        ? String(merged.layout.productListStyle)
        : preset.layout.productListStyle,
      productColumns: clampColumns(merged.layout?.productColumns),
      headerStyle: ["left", "centered", "minimal"].includes(String(merged.layout?.headerStyle || ""))
        ? String(merged.layout.headerStyle)
        : preset.layout.headerStyle,
      footerStyle: ["classic", "stacked", "minimal"].includes(String(merged.layout?.footerStyle || ""))
        ? String(merged.layout.footerStyle)
        : preset.layout.footerStyle,
      spacing: ["compact", "comfortable", "spacious"].includes(String(merged.layout?.spacing || ""))
        ? String(merged.layout.spacing)
        : preset.layout.spacing,
    },
    components: {
      productCard: ["minimal", "modern", "detailed"].includes(String(merged.components?.productCard || ""))
        ? String(merged.components.productCard)
        : preset.components.productCard,
    },
    sections,
    sectionOrder: normalizeSectionOrder(homepageSections.map((section) => section.type), sections),
    homepageSections,
  };
}

function getThemeDefinition(themeId = DEFAULT_THEME_ID, customThemes = [], curatedThemes = []) {
  const customCatalog = Array.isArray(customThemes)
    ? customThemes.map((theme) => serializeCustomThemeDefinition(theme)).filter(Boolean)
    : [];
  const curatedCatalog = Array.isArray(curatedThemes)
    ? curatedThemes
        .map((theme) => (theme?.id ? theme : serializeCustomThemeDefinition(theme)))
        .filter(Boolean)
    : [];
  const combinedCatalog = uniqueThemeCatalogEntries([...customCatalog, ...curatedCatalog]);
  return combinedCatalog.find((theme) => theme.id === themeId) || THEME_LIBRARY[themeId] || THEME_LIBRARY[DEFAULT_THEME_ID];
}

function resolveMerchantTier(value) {
  const normalized = String(value || "STANDARD").toUpperCase();
  return Object.prototype.hasOwnProperty.call(MERCHANT_TIER_ORDER, normalized) ? normalized : "STANDARD";
}

function getThemePlanRequirement(plan = "FREE") {
  const normalized = String(plan || "FREE").toUpperCase();
  return PLAN_TIER_REQUIREMENTS[normalized] || "STANDARD";
}

function hasRequiredTier(merchantTier, requiredTier = "STANDARD") {
  const currentRank = MERCHANT_TIER_ORDER[resolveMerchantTier(merchantTier)];
  const requiredRank = MERCHANT_TIER_ORDER[resolveMerchantTier(requiredTier)];
  return currentRank >= requiredRank;
}

function getThemeEditorCapabilities(merchantTier) {
  const resolvedTier = resolveMerchantTier(merchantTier);
  return {
    merchantTier: resolvedTier,
    canUsePremiumThemes: hasRequiredTier(resolvedTier, "SILVER"),
    canUploadHeroMedia: hasRequiredTier(resolvedTier, "SILVER"),
    canUseHeroLayouts: hasRequiredTier(resolvedTier, "SILVER"),
    canAdjustSectionColumns: hasRequiredTier(resolvedTier, "SILVER"),
    canUseCustomThemeUpload: hasRequiredTier(resolvedTier, "PLATINUM"),
  };
}

function validateThemeAccess(merchantTier, themeId, themeConfig = {}, customThemes = []) {
  const definition = getThemeDefinition(themeId, customThemes);
  const violations = [];
  const capabilities = getThemeEditorCapabilities(merchantTier);
  const homepageSections = Array.isArray(themeConfig?.homepageSections) ? themeConfig.homepageSections : [];
  const heroSection = homepageSections.find((section) => String(section?.type || "") === "hero") || null;
  const productSections = homepageSections.filter((section) =>
    ["featuredProducts", "offers"].includes(String(section?.type || ""))
  );
  const requiredTier = definition.requiredTier || getThemePlanRequirement(definition.plan);

  if (!hasRequiredTier(merchantTier, requiredTier)) {
    violations.push(`Theme "${definition.name}" requires the ${definition.plan} plan.`);
  }

  if (!capabilities.canUploadHeroMedia) {
    const heroImageUrl = String(heroSection?.config?.imageUrl || "").trim();
    if (heroImageUrl) {
      violations.push("Hero image uploads require the Pro plan.");
    }
  }

  if (!capabilities.canUseHeroLayouts) {
    const heroLayout = String(heroSection?.config?.heroLayout || "split");
    if (heroLayout !== "split") {
      violations.push("Advanced hero layouts require the Pro plan.");
    }
  }

  if (!capabilities.canAdjustSectionColumns) {
    const hasCustomColumns = productSections.some((section) => Number(section?.config?.productColumns || 0) > 0);
    if (hasCustomColumns) {
      violations.push("Section-specific product columns require the Pro plan.");
    }
  }

  return {
    definition,
    capabilities,
    violations,
    allowed: violations.length === 0,
  };
}

function buildResolvedTheme(themeId, config, customThemes = [], curatedThemes = []) {
  const definition = getThemeDefinition(themeId, customThemes, curatedThemes);
  const themeConfig = normalizeThemeConfig(config, definition.id, [...customThemes, ...curatedThemes]);

  return {
    themeId: definition.id,
    themeName: definition.name,
    category: definition.category,
    plan: definition.plan,
    preview: definition.preview,
    config: themeConfig,
    cssVariables: {
      "--theme-primary": themeConfig.colors.primary,
      "--theme-secondary": themeConfig.colors.secondary,
      "--theme-background": themeConfig.colors.background,
      "--theme-surface": themeConfig.colors.surface,
      "--theme-text": themeConfig.colors.text,
      "--theme-button-text": themeConfig.colors.buttonText,
      "--theme-font-family": FONT_MAP[themeConfig.typography.fontFamily] || FONT_MAP.Poppins,
      "--theme-columns": String(themeConfig.layout.productColumns),
      "--theme-gap": themeConfig.layout.spacing === "compact" ? "1rem" : themeConfig.layout.spacing === "spacious" ? "1.75rem" : "1.25rem",
      "--theme-radius": themeConfig.components.productCard === "minimal" ? "1.25rem" : themeConfig.components.productCard === "detailed" ? "1.75rem" : "1.5rem",
    },
  };
}

function resolveShopTheme(shop, curatedThemes = []) {
  const themeId = String(shop?.themeId || DEFAULT_THEME_ID);
  const config = shop?.themeConfig || shop?.themeOverrides || {};
  return buildResolvedTheme(themeId, config, shop?.customThemes || [], curatedThemes);
}

function getThemeCatalog(customThemes = [], curatedThemes = []) {
  const baseCatalog = Object.values(THEME_LIBRARY).map((theme) => ({
    id: theme.id,
    name: theme.name,
    category: theme.category,
    plan: theme.plan,
    requiredTier: theme.requiredTier || getThemePlanRequirement(theme.plan),
    preview: theme.preview,
    config: normalizeThemeConfig(theme.config, theme.id),
    isCustom: false,
  }));
  const customCatalog = Array.isArray(customThemes)
    ? customThemes.map((theme) => serializeCustomThemeDefinition(theme)).filter(Boolean)
    : [];
  const curatedCatalog = Array.isArray(curatedThemes)
    ? curatedThemes
        .map((theme) => (theme?.id ? theme : serializeCustomThemeDefinition(theme)))
        .filter(Boolean)
    : [];
  return uniqueThemeCatalogEntries([...baseCatalog, ...customCatalog, ...curatedCatalog]);
}

module.exports = {
  DEFAULT_THEME_ID,
  SECTION_IDS,
  FONT_MAP,
  MERCHANT_TIER_ORDER,
  DEFAULT_SECTION_LIBRARY,
  getThemeCatalog,
  getThemeDefinition,
  getThemeEditorCapabilities,
  getThemePlanRequirement,
  hasRequiredTier,
  normalizeThemeConfig,
  buildResolvedTheme,
  resolveShopTheme,
  resolveMerchantTier,
  serializeCustomThemeDefinition,
  validateThemeAccess,
};
