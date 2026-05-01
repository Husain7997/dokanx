"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, CardDescription, CardTitle, Checkbox, SelectDropdown, TextInput } from "@dokanx/ui";

import {
  createCustomTheme,
  createThemeMediaAsset,
  deleteCustomTheme,
  deleteThemeMediaAsset,
  exportCustomTheme,
  getShopSettings,
  getThemeCatalog,
  getThemeDraft,
  installMarketplaceTheme,
  rollbackThemeSnapshot,
  toggleFavoriteTheme,
  updateThemeConfig,
  updateThemeExperiment,
} from "@/lib/runtime-api";
import {
  DEFAULT_SECTION_LIBRARY,
  DEFAULT_THEME_CONFIG,
  type HomepageSection,
  type MerchantThemeConfig,
  type ThemeSectionType,
} from "@/lib/theme-config";

import { WorkspaceCard } from "./workspace-card";

type ThemeCatalogItem = {
  id?: string;
  name?: string;
  category?: string;
  plan?: string;
  requiredTier?: string;
  isCustom?: boolean;
  preview?: string;
  config?: MerchantThemeConfig;
};

type ThemeState = {
  themeId?: string;
  themeName?: string;
  plan?: string;
  preview?: string;
  config?: MerchantThemeConfig;
};

type ThemeHistoryEntry = {
  snapshotId?: string;
  themeId?: string;
  mode?: "publish" | "rollback";
  sourceSnapshotId?: string | null;
  actorName?: string;
  actorRole?: string;
  createdAt?: string | null;
  versionLabel?: string;
  changeCount?: number;
  diffSummary?: Array<{
    key?: string;
    label?: string;
    before?: string;
    after?: string;
  }>;
  preview?: ThemeState | null;
};

type ThemeAccessState = {
  merchantTier?: string;
  canUsePremiumThemes?: boolean;
  canUploadHeroMedia?: boolean;
  canUseHeroLayouts?: boolean;
  canAdjustSectionColumns?: boolean;
  canUseCustomThemeUpload?: boolean;
};

type ThemeMediaAsset = {
  assetId?: string;
  name?: string;
  type?: string;
  dataUrl?: string;
  alt?: string;
  tags?: string[];
  createdAt?: string | null;
};

type CustomThemeItem = {
  id?: string;
  themeId?: string;
  name?: string;
  category?: string;
  plan?: string;
  requiredTier?: string;
  isCustom?: boolean;
  preview?: string;
  version?: string;
  versionNotes?: string;
  config?: MerchantThemeConfig;
};

type SnapshotDiffItem = {
  label: string;
  before: string;
  after: string;
};

type ThemeMarketplaceState = {
  installedThemeIds?: string[];
  favoriteThemeIds?: string[];
};

type ThemeExperimentState = {
  isEnabled?: boolean;
  experimentId?: string;
  name?: string;
  trafficSplit?: number;
  variants?: Array<{
    id?: string;
    label?: string;
    themeId?: string;
    config?: MerchantThemeConfig;
  }>;
};

function createDefaultSection(type: ThemeSectionType): HomepageSection {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...DEFAULT_SECTION_LIBRARY[type],
  };
}

function normalizeThemeConfig(input?: Partial<MerchantThemeConfig> | null): MerchantThemeConfig {
  const homepageSections = Array.isArray(input?.homepageSections) && input?.homepageSections.length
    ? input.homepageSections.map((section, index) => ({
        ...createDefaultSection(section.type),
        ...section,
        config: {
          ...createDefaultSection(section.type).config,
          ...(section.config || {}),
        },
        id: String(section.id || `${section.type}-${index + 1}`),
      }))
    : DEFAULT_THEME_CONFIG.homepageSections.map((section) => ({ ...section }));

  const sections = {
    hero: homepageSections.some((section) => section.type === "hero" && section.enabled),
    featuredProducts: homepageSections.some((section) => section.type === "featuredProducts" && section.enabled),
    categories: homepageSections.some((section) => section.type === "categories" && section.enabled),
    offers: homepageSections.some((section) => section.type === "offers" && section.enabled),
    testimonials: homepageSections.some((section) => section.type === "testimonials" && section.enabled),
  };

  return {
    colors: {
      ...DEFAULT_THEME_CONFIG.colors,
      ...(input?.colors || {}),
    },
    typography: {
      ...DEFAULT_THEME_CONFIG.typography,
      ...(input?.typography || {}),
    },
    layout: {
      ...DEFAULT_THEME_CONFIG.layout,
      ...(input?.layout || {}),
    },
    components: {
      ...DEFAULT_THEME_CONFIG.components,
      ...(input?.components || {}),
    },
    sections,
    sectionOrder: homepageSections.map((section) => section.type),
    homepageSections,
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Unable to read theme package."));
    reader.readAsText(file);
  });
}

function downloadJsonFile(filename: string, payload: unknown) {
  if (typeof window === "undefined") return;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function describeSection(section?: HomepageSection) {
  if (!section) return "Missing";
  const bits = [
    section.enabled ? "visible" : "hidden",
    section.style || "default",
    section.title || section.type,
  ];
  if (section.type === "hero") {
    bits.push(section.config?.heroLayout || "split");
    bits.push(section.config?.imageUrl ? "with media" : "no media");
  }
  if (section.type === "featuredProducts" || section.type === "offers") {
    bits.push(section.config?.productCollection || "recommended");
    bits.push(`${section.config?.productColumns || 4} cols`);
  }
  return bits.join(" • ");
}

function buildSnapshotDiff(currentConfig: MerchantThemeConfig, snapshotConfig: MerchantThemeConfig): SnapshotDiffItem[] {
  const items: SnapshotDiffItem[] = [];
  const push = (label: string, before: string, after: string) => {
    if (before !== after) {
      items.push({ label, before, after });
    }
  };

  push("Primary color", currentConfig.colors.primary, snapshotConfig.colors.primary);
  push("Secondary color", currentConfig.colors.secondary, snapshotConfig.colors.secondary);
  push("Font family", currentConfig.typography.fontFamily, snapshotConfig.typography.fontFamily);
  push("Heading style", currentConfig.typography.headingStyle, snapshotConfig.typography.headingStyle);
  push("Header style", currentConfig.layout.headerStyle, snapshotConfig.layout.headerStyle);
  push("Product list", currentConfig.layout.productListStyle, snapshotConfig.layout.productListStyle);
  push("Global columns", String(currentConfig.layout.productColumns), String(snapshotConfig.layout.productColumns));
  push("Spacing", currentConfig.layout.spacing, snapshotConfig.layout.spacing);
  push("Product card", currentConfig.components.productCard, snapshotConfig.components.productCard);

  const currentOrder = currentConfig.homepageSections.map((section) => section.type).join(" -> ");
  const snapshotOrder = snapshotConfig.homepageSections.map((section) => section.type).join(" -> ");
  push("Section order", currentOrder, snapshotOrder);

  const sectionTypes = Array.from(
    new Set([...currentConfig.homepageSections.map((section) => section.type), ...snapshotConfig.homepageSections.map((section) => section.type)])
  );

  sectionTypes.forEach((type) => {
    const currentSection = currentConfig.homepageSections.find((section) => section.type === type);
    const snapshotSection = snapshotConfig.homepageSections.find((section) => section.type === type);
    push(`${type} section`, describeSection(currentSection), describeSection(snapshotSection));
  });

  return items;
}

export function ThemeEditorWorkspace() {
  const [catalog, setCatalog] = useState<ThemeCatalogItem[]>([]);
  const [themeId, setThemeId] = useState("merchant-theme");
  const [draft, setDraft] = useState<MerchantThemeConfig>(DEFAULT_THEME_CONFIG);
  const [savedTheme, setSavedTheme] = useState<ThemeState | null>(null);
  const [draftTheme, setDraftTheme] = useState<ThemeState | null>(null);
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [history, setHistory] = useState<ThemeHistoryEntry[]>([]);
  const [themeAccess, setThemeAccess] = useState<ThemeAccessState>({});
  const [mediaAssets, setMediaAssets] = useState<ThemeMediaAsset[]>([]);
  const [customThemes, setCustomThemes] = useState<CustomThemeItem[]>([]);
  const [marketplace, setMarketplace] = useState<ThemeMarketplaceState>({});
  const [experiment, setExperiment] = useState<ThemeExperimentState>({});
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [shopName, setShopName] = useState("DokanX Merchant");
  const [logoUrl, setLogoUrl] = useState("");
  const [marketplaceFilter, setMarketplaceFilter] = useState<"all" | "installed" | "favorites" | "free" | "pro" | "enterprise">("all");
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");
  const [viewMode, setViewMode] = useState<"draft" | "live">("draft");
  const [status, setStatus] = useState<string | null>("Drag sections to reorder, edit copy inline, then publish.");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [catalogResponse, themeResponse, settingsResponse] = await Promise.all([
          getThemeCatalog(),
          getThemeDraft(),
          getShopSettings(),
        ]);

        if (!active) return;

        const nextCatalog = Array.isArray(catalogResponse.data) ? (catalogResponse.data as ThemeCatalogItem[]) : [];
        const published = (themeResponse.data?.published || {}) as ThemeState;
        const draftState = (themeResponse.data?.draft || published || {}) as ThemeState;
        const nextConfig = normalizeThemeConfig((draftState.config || settingsResponse.data?.themeConfig || DEFAULT_THEME_CONFIG) as Partial<MerchantThemeConfig>);

        setCatalog(Array.isArray(themeResponse.data?.catalog) ? (themeResponse.data?.catalog as ThemeCatalogItem[]) : nextCatalog);
        setSavedTheme(published);
        setDraftTheme(draftState);
        setDraftUpdatedAt(themeResponse.data?.draftUpdatedAt || null);
        setPublishedAt(themeResponse.data?.publishedAt || null);
        setHistory(Array.isArray(themeResponse.data?.history) ? (themeResponse.data?.history as ThemeHistoryEntry[]) : []);
        setThemeAccess((settingsResponse.data?.themeAccess || themeResponse.data?.access || {}) as ThemeAccessState);
        setMediaAssets(Array.isArray(themeResponse.data?.mediaAssets) ? (themeResponse.data?.mediaAssets as ThemeMediaAsset[]) : []);
        setCustomThemes(Array.isArray(themeResponse.data?.customThemes) ? (themeResponse.data?.customThemes as CustomThemeItem[]) : []);
        setMarketplace((themeResponse.data?.marketplace || {}) as ThemeMarketplaceState);
        setExperiment((themeResponse.data?.experiment || {}) as ThemeExperimentState);
        setThemeId(String(draftState.themeId || published.themeId || nextCatalog[0]?.id || "merchant-theme"));
        setDraft(nextConfig);
        setShopName(String(settingsResponse.data?.name || "DokanX Merchant"));
        setLogoUrl(String(settingsResponse.data?.logoUrl || ""));
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to load theme editor.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const selectedTheme = useMemo(
    () => catalog.find((item) => String(item.id || "") === themeId) || null,
    [catalog, themeId]
  );

  const availableSectionTypes = useMemo(
    () =>
      (Object.keys(DEFAULT_SECTION_LIBRARY) as ThemeSectionType[]).filter(
        (type) => !draft.homepageSections.some((section) => section.type === type)
      ),
    [draft.homepageSections]
  );

  function setHomepageSections(updater: (sections: HomepageSection[]) => HomepageSection[]) {
    setDraft((current) => normalizeThemeConfig({ ...current, homepageSections: updater(current.homepageSections) }));
  }

  function applyPreset(nextThemeId: string) {
    const preset = catalog.find((item) => String(item.id || "") === nextThemeId);
    if (preset?.plan === "PRO" && !themeAccess.canUsePremiumThemes) {
      setStatus("Premium themes require the Pro plan. Upgrade to unlock this storefront preset.");
      return;
    }
    if (preset?.plan === "ENTERPRISE" && !themeAccess.canUseCustomThemeUpload) {
      setStatus("Custom themes require the Enterprise plan.");
      return;
    }
    setThemeId(nextThemeId);
    if (preset?.config) {
      setDraft(normalizeThemeConfig(preset.config));
    }
  }

  function updateSection(sectionId: string, patch: Partial<HomepageSection>) {
    setHomepageSections((sections) =>
      sections.map((section) => (section.id === sectionId ? { ...section, ...patch } : section))
    );
  }

  function updateSectionConfig(sectionId: string, patch: Partial<NonNullable<HomepageSection["config"]>>) {
    setHomepageSections((sections) =>
      sections.map((section) =>
        section.id === sectionId
          ? { ...section, config: { ...(section.config || {}), ...patch } }
          : section
      )
    );
  }

  function removeSection(sectionId: string) {
    setHomepageSections((sections) => sections.filter((section) => section.id !== sectionId));
  }

  function addSection(type: ThemeSectionType) {
    setHomepageSections((sections) => [...sections, createDefaultSection(type)]);
  }

  async function uploadSectionImage(sectionId: string, file?: File | null) {
    if (!file) return;
    if (!themeAccess.canUploadHeroMedia) {
      setStatus("Hero media upload is available on the Pro plan.");
      return;
    }
    setStatus("Uploading image into theme draft...");
    try {
      const imageUrl = await readFileAsDataUrl(file);
      updateSectionConfig(sectionId, { imageUrl, imageAlt: file.name });
      setStatus("Image added to the draft. Save or publish when ready.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to process image.");
    }
  }

  async function saveMediaToLibrary(file?: File | null) {
    if (!file) return;
    if (!themeAccess.canUploadHeroMedia) {
      setStatus("Theme media library is available on the Pro plan.");
      return;
    }

    setSaving(true);
    setStatus("Saving asset to the media library...");
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const response = await createThemeMediaAsset({
        name: file.name,
        dataUrl,
        alt: file.name,
        tags: ["hero", "theme"],
      });
      const nextAssets = Array.isArray(response.data?.assets) ? (response.data.assets as ThemeMediaAsset[]) : [];
      setMediaAssets(nextAssets);
      setStatus("Theme asset saved. You can now reuse it across sections.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save theme asset.");
    } finally {
      setSaving(false);
    }
  }

  async function removeMediaAsset(assetId: string) {
    setSaving(true);
    setStatus("Removing theme asset...");
    try {
      const response = await deleteThemeMediaAsset(assetId);
      const nextAssets = Array.isArray(response.data?.assets) ? (response.data.assets as ThemeMediaAsset[]) : [];
      setMediaAssets(nextAssets);
      setStatus("Theme asset removed from the library.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to remove theme asset.");
    } finally {
      setSaving(false);
    }
  }

  async function importCustomThemePackage(file?: File | null) {
    if (!file) return;
    if (!themeAccess.canUseCustomThemeUpload) {
      setStatus("Custom theme upload is available on the Enterprise plan.");
      return;
    }

    setSaving(true);
    setStatus("Importing custom theme package...");
    try {
      const content = await readFileAsText(file);
      const parsed = JSON.parse(content) as Record<string, unknown>;
      const response = await createCustomTheme({ theme: parsed });
      setCustomThemes(Array.isArray(response.data?.themes) ? (response.data?.themes as CustomThemeItem[]) : []);
      setCatalog(Array.isArray(response.data?.catalog) ? (response.data?.catalog as ThemeCatalogItem[]) : catalog);
      setStatus("Custom theme imported. You can now select it from the theme family list.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to import custom theme package.");
    } finally {
      setSaving(false);
    }
  }

  async function removeCustomThemePackage(nextThemeId: string) {
    setSaving(true);
    setStatus("Removing custom theme...");
    try {
      const response = await deleteCustomTheme(nextThemeId);
      setCustomThemes(Array.isArray(response.data?.themes) ? (response.data?.themes as CustomThemeItem[]) : []);
      setCatalog(Array.isArray(response.data?.catalog) ? (response.data?.catalog as ThemeCatalogItem[]) : catalog);
      setStatus("Custom theme removed from your enterprise catalog.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to remove custom theme.");
    } finally {
      setSaving(false);
    }
  }

  async function exportCustomThemePackage(nextThemeId: string) {
    setSaving(true);
    setStatus("Preparing theme export...");
    try {
      const response = await exportCustomTheme(nextThemeId);
      const theme = response.data?.theme;
      if (!theme) {
        throw new Error("Theme export payload is empty.");
      }
      downloadJsonFile(`${nextThemeId}.theme.json`, theme);
      setStatus("Theme package exported.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to export custom theme.");
    } finally {
      setSaving(false);
    }
  }

  async function installThemeFromMarketplace(nextThemeId: string) {
    setSaving(true);
    setStatus("Installing theme from marketplace...");
    try {
      const response = await installMarketplaceTheme(nextThemeId);
      setMarketplace((response.data?.marketplace || {}) as ThemeMarketplaceState);
      setCatalog(Array.isArray(response.data?.catalog) ? (response.data?.catalog as ThemeCatalogItem[]) : catalog);
      setThemeAccess((response.data?.access || themeAccess) as ThemeAccessState);
      setStatus("Theme installed. You can now select and customize it.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to install theme.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleFavorite(nextThemeId: string) {
    setSaving(true);
    try {
      const response = await toggleFavoriteTheme(nextThemeId);
      setMarketplace((response.data?.marketplace || {}) as ThemeMarketplaceState);
      setCatalog(Array.isArray(response.data?.catalog) ? (response.data?.catalog as ThemeCatalogItem[]) : catalog);
      setThemeAccess((response.data?.access || themeAccess) as ThemeAccessState);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update favorite.");
    } finally {
      setSaving(false);
    }
  }

  function moveSection(sectionId: string, direction: "up" | "down") {
    setHomepageSections((sections) => {
      const index = sections.findIndex((section) => section.id === sectionId);
      if (index < 0) return sections;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= sections.length) return sections;
      const next = [...sections];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  }

  function reorderSection(activeId: string, overId: string) {
    if (!activeId || !overId || activeId === overId) return;
    setHomepageSections((sections) => {
      const from = sections.findIndex((section) => section.id === activeId);
      const to = sections.findIndex((section) => section.id === overId);
      if (from < 0 || to < 0) return sections;
      const next = [...sections];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  async function persist(label: "saved" | "published") {
    setSaving(true);
    setStatus(null);
    try {
      const response = await updateThemeConfig({
        themeId,
        themeConfig: draft as unknown as Record<string, unknown>,
        mode: label === "saved" ? "draft" : "publish",
      });
      const payload = response.data as {
        draft?: ThemeState;
        published?: ThemeState;
        draftUpdatedAt?: string | null;
        publishedAt?: string | null;
        history?: ThemeHistoryEntry[];
        access?: ThemeAccessState;
        mediaAssets?: ThemeMediaAsset[];
        customThemes?: CustomThemeItem[];
        catalog?: ThemeCatalogItem[];
        marketplace?: ThemeMarketplaceState;
        experiment?: ThemeExperimentState;
      };
      if (payload?.draft) {
        setDraftTheme(payload.draft);
      }
      if (payload?.published) {
        setSavedTheme(payload.published);
      }
      setDraftUpdatedAt(payload?.draftUpdatedAt || null);
      setPublishedAt(payload?.publishedAt || null);
      setHistory(Array.isArray(payload?.history) ? (payload.history as ThemeHistoryEntry[]) : []);
      setThemeAccess((payload?.access || themeAccess) as ThemeAccessState);
      setMediaAssets(Array.isArray(payload?.mediaAssets) ? (payload.mediaAssets as ThemeMediaAsset[]) : mediaAssets);
      setCustomThemes(Array.isArray(payload?.customThemes) ? (payload.customThemes as CustomThemeItem[]) : customThemes);
      setCatalog(Array.isArray(payload?.catalog) ? (payload.catalog as ThemeCatalogItem[]) : catalog);
      setMarketplace((payload?.marketplace || marketplace) as ThemeMarketplaceState);
      setExperiment((payload?.experiment || experiment) as ThemeExperimentState);
      setStatus(label === "published" ? "Builder changes published to the storefront." : "Builder draft saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save theme.");
    } finally {
      setSaving(false);
    }
  }

  async function rollback(snapshotId: string) {
    setSaving(true);
    setStatus(null);
    try {
      const response = await rollbackThemeSnapshot(snapshotId);
      const payload = response.data as {
        draft?: ThemeState;
        published?: ThemeState;
        draftUpdatedAt?: string | null;
        publishedAt?: string | null;
        history?: ThemeHistoryEntry[];
        access?: ThemeAccessState;
        mediaAssets?: ThemeMediaAsset[];
        customThemes?: CustomThemeItem[];
        catalog?: ThemeCatalogItem[];
        marketplace?: ThemeMarketplaceState;
        experiment?: ThemeExperimentState;
      };
      if (payload?.draft) {
        setDraftTheme(payload.draft);
        setDraft(normalizeThemeConfig(payload.draft.config as Partial<MerchantThemeConfig>));
        setThemeId(String(payload.draft.themeId || savedTheme?.themeId || "merchant-theme"));
      }
      if (payload?.published) {
        setSavedTheme(payload.published);
      }
      setDraftUpdatedAt(payload?.draftUpdatedAt || null);
      setPublishedAt(payload?.publishedAt || null);
      setHistory(Array.isArray(payload?.history) ? payload.history : []);
      setThemeAccess((payload?.access || themeAccess) as ThemeAccessState);
      setMediaAssets(Array.isArray(payload?.mediaAssets) ? (payload.mediaAssets as ThemeMediaAsset[]) : mediaAssets);
      setCustomThemes(Array.isArray(payload?.customThemes) ? (payload.customThemes as CustomThemeItem[]) : customThemes);
      setCatalog(Array.isArray(payload?.catalog) ? (payload.catalog as ThemeCatalogItem[]) : catalog);
      setMarketplace((payload?.marketplace || marketplace) as ThemeMarketplaceState);
      setExperiment((payload?.experiment || experiment) as ThemeExperimentState);
      setViewMode("live");
      setStatus("Published theme rolled back and synced with the draft preview.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to rollback theme.");
    } finally {
      setSaving(false);
    }
  }

  async function persistExperiment() {
    setSaving(true);
    setStatus("Saving theme experiment...");
    try {
      const variants = [
        {
          id: "A",
          label: "Variant A",
          themeId,
          config: draft,
        },
        {
          id: "B",
          label: "Variant B",
          themeId: String(experiment.variants?.[1]?.themeId || themeId),
          config: normalizeThemeConfig(experiment.variants?.[1]?.config || draft),
        },
      ];
      const response = await updateThemeExperiment({
        experiment: {
          isEnabled: experiment.isEnabled === true,
          name: String(experiment.name || "Homepage theme experiment"),
          trafficSplit: Number(experiment.trafficSplit || 50),
          variants,
        },
      });
      setExperiment((response.data?.experiment || experiment) as ThemeExperimentState);
      setCatalog(Array.isArray(response.data?.catalog) ? (response.data?.catalog as ThemeCatalogItem[]) : catalog);
      setStatus("Theme experiment updated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save theme experiment.");
    } finally {
      setSaving(false);
    }
  }

  const dirty =
    JSON.stringify(normalizeThemeConfig(draftTheme?.config || savedTheme?.config || DEFAULT_THEME_CONFIG)) !== JSON.stringify(draft) ||
    String(draftTheme?.themeId || savedTheme?.themeId || "") !== themeId;
  const previewConfig = viewMode === "live"
    ? normalizeThemeConfig(savedTheme?.config || DEFAULT_THEME_CONFIG)
    : draft;
  const liveThemeConfig = normalizeThemeConfig(savedTheme?.config || DEFAULT_THEME_CONFIG);
  const selectedHistoryEntry = history.find((entry) => String(entry.snapshotId || "") === String(selectedHistoryId || "")) || null;
  const selectedHistoryConfig = normalizeThemeConfig((selectedHistoryEntry?.preview?.config || DEFAULT_THEME_CONFIG) as Partial<MerchantThemeConfig>);
  const selectedHistoryDiff = selectedHistoryEntry ? buildSnapshotDiff(liveThemeConfig, selectedHistoryConfig) : [];
  const selectedThemeLocked = Boolean(
    (selectedTheme?.plan === "PRO" && !themeAccess.canUsePremiumThemes) ||
    (selectedTheme?.plan === "ENTERPRISE" && !themeAccess.canUseCustomThemeUpload)
  );
  const merchantPlanLabel =
    themeAccess.merchantTier === "PLATINUM"
      ? "Enterprise"
      : themeAccess.merchantTier === "GOLD" || themeAccess.merchantTier === "SILVER"
        ? "Pro"
        : "Free";
  const installedThemeIds = marketplace.installedThemeIds || [];
  const favoriteThemeIds = marketplace.favoriteThemeIds || [];
  const marketplaceThemes = catalog.filter((theme) => {
    const plan = String(theme.plan || "FREE").toLowerCase();
    const id = String(theme.id || "");
    if (marketplaceFilter === "installed") return installedThemeIds.includes(id);
    if (marketplaceFilter === "favorites") return favoriteThemeIds.includes(id);
    if (marketplaceFilter === "free") return plan === "free";
    if (marketplaceFilter === "pro") return plan === "pro";
    if (marketplaceFilter === "enterprise") return plan === "enterprise";
    return true;
  });

  return (
    <div className="grid gap-6">
      <WorkspaceCard
        title="Theme editor"
        description="Control branding, typography, layout, and drag-and-drop homepage sections from one no-code workspace."
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex flex-wrap gap-2">
            <Badge variant="neutral">{selectedTheme?.name || "Theme"}</Badge>
            <Badge variant="neutral">{selectedTheme?.plan || "FREE"}</Badge>
            <Badge variant="neutral">{merchantPlanLabel}</Badge>
            <Badge variant={dirty ? "warning" : "success"}>{dirty ? "Unsaved changes" : "Synced"}</Badge>
            {draftUpdatedAt ? <Badge variant="neutral">Draft {draftUpdatedAt}</Badge> : null}
            {publishedAt ? <Badge variant="neutral">Published {publishedAt}</Badge> : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setDraft(normalizeThemeConfig(draftTheme?.config || savedTheme?.config || DEFAULT_THEME_CONFIG))} disabled={saving}>
              Reset draft
            </Button>
            <Button variant="secondary" onClick={() => void persist("saved")} disabled={saving || selectedThemeLocked}>
              Save
            </Button>
            <Button onClick={() => void persist("published")} loading={saving} loadingText="Publishing" disabled={selectedThemeLocked}>
              Publish
            </Button>
          </div>
        </div>
        {status ? <Alert className="mt-6" variant="info">{status}</Alert> : null}
        {!themeAccess.canUsePremiumThemes ? (
          <Alert className="mt-4" variant="warning">
            Free plan can use the default theme with basic branding controls. Upgrade to Pro for premium themes, hero media, advanced layouts, and section column tuning.
          </Alert>
        ) : null}
      </WorkspaceCard>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="grid gap-6">
          <WorkspaceCard title="Theme family" description="Choose a base theme first, then refine tokens and component variants.">
            <div className="grid gap-4">
              <SelectDropdown
                label="Base theme"
                value={themeId}
                onValueChange={applyPreset}
                options={catalog.map((item) => ({
                  label: `${item.name || item.id}${item.plan === "PRO" ? " • Pro" : item.plan === "ENTERPRISE" ? " • Enterprise" : ""}${item.category ? ` (${item.category})` : ""}`,
                  value: String(item.id || ""),
                }))}
                disabled={loading}
              />
              <div className="rounded-3xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{selectedTheme?.name || "Theme"}</p>
                <p className="mt-2">{selectedTheme?.preview || "Preset selected for this storefront."}</p>
                {selectedThemeLocked ? (
                  <p className="mt-3 text-xs font-medium text-amber-600">
                    {selectedTheme?.plan === "ENTERPRISE"
                      ? "This custom theme is locked outside the Enterprise plan."
                      : "This theme is locked on the Free plan."}
                  </p>
                ) : null}
              </div>
            </div>
          </WorkspaceCard>

          <WorkspaceCard title="Theme marketplace" description="Browse, install, favorite, and activate storefront themes like a real marketplace workflow.">
            <div className="grid gap-4">
              <SelectDropdown
                label="Marketplace filter"
                value={marketplaceFilter}
                onValueChange={(value) => setMarketplaceFilter(value as typeof marketplaceFilter)}
                options={[
                  { label: "All themes", value: "all" },
                  { label: "Installed", value: "installed" },
                  { label: "Favorites", value: "favorites" },
                  { label: "Free", value: "free" },
                  { label: "Pro", value: "pro" },
                  { label: "Enterprise", value: "enterprise" },
                ]}
              />
              <div className="grid gap-3">
                {marketplaceThemes.length ? (
                  marketplaceThemes.map((theme) => {
                    const id = String(theme.id || "");
                    const installed = installedThemeIds.includes(id);
                    const favorite = favoriteThemeIds.includes(id);
                    const locked =
                      (theme.plan === "PRO" && !themeAccess.canUsePremiumThemes) ||
                      (theme.plan === "ENTERPRISE" && !themeAccess.canUseCustomThemeUpload);

                    return (
                      <div key={id} className="rounded-3xl border border-border/60 bg-card/80 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="neutral">{theme.plan || "FREE"}</Badge>
                              {theme.isCustom ? <Badge variant="neutral">Custom</Badge> : null}
                              {installed ? <Badge variant="success">Installed</Badge> : null}
                              {favorite ? <Badge variant="warning">Favorite</Badge> : null}
                            </div>
                            <p className="mt-2 text-sm font-medium text-foreground">{theme.name || id}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{theme.preview || "Theme marketplace item"}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => void toggleFavorite(id)}
                              disabled={saving}
                            >
                              {favorite ? "Unfavorite" : "Favorite"}
                            </Button>
                            {installed ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => applyPreset(id)}
                                disabled={saving || locked}
                              >
                                Select
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => void installThemeFromMarketplace(id)}
                                disabled={saving || locked}
                              >
                                Install
                              </Button>
                            )}
                          </div>
                        </div>
                        {locked ? (
                          <p className="mt-3 text-xs font-medium text-amber-600">
                            {theme.plan === "ENTERPRISE"
                              ? "Upgrade to Enterprise to install this theme."
                              : "Upgrade to Pro to install this theme."}
                          </p>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-3xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                    No themes match this marketplace filter.
                  </div>
                )}
              </div>
            </div>
          </WorkspaceCard>

          <WorkspaceCard title="Theme experiment" description="Run a lightweight A/B test between the current draft and a second saved theme.">
            <div className="grid gap-4 md:grid-cols-2">
              <Checkbox
                label="Enable experiment"
                checked={experiment.isEnabled === true}
                onCheckedChange={(checked) =>
                  setExperiment((current) => ({
                    ...current,
                    isEnabled: checked === true,
                  }))
                }
              />
              <TextInput
                label="Experiment name"
                value={String(experiment.name || "")}
                onChange={(event) =>
                  setExperiment((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Homepage hero experiment"
              />
              <SelectDropdown
                label="Traffic split"
                value={String(experiment.trafficSplit || 50)}
                onValueChange={(value) =>
                  setExperiment((current) => ({
                    ...current,
                    trafficSplit: Number(value),
                  }))
                }
                options={[
                  { label: "50 / 50", value: "50" },
                  { label: "60 / 40", value: "60" },
                  { label: "70 / 30", value: "70" },
                ]}
              />
              <SelectDropdown
                label="Variant B theme"
                value={String(experiment.variants?.[1]?.themeId || themeId)}
                onValueChange={(value) =>
                  setExperiment((current) => ({
                    ...current,
                    variants: [
                      {
                        id: "A",
                        label: "Variant A",
                        themeId,
                        config: draft,
                      },
                      {
                        id: "B",
                        label: "Variant B",
                        themeId: value,
                        config: catalog.find((item) => String(item.id || "") === value)?.config || draft,
                      },
                    ],
                  }))
                }
                options={catalog.map((item) => ({
                  label: item.name || item.id || "Theme",
                  value: String(item.id || ""),
                }))}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="neutral">Variant A: current draft</Badge>
              <Badge variant="neutral">Variant B: {experiment.variants?.[1]?.themeId || themeId}</Badge>
              <Button variant="secondary" onClick={() => void persistExperiment()} disabled={saving}>
                Save experiment
              </Button>
            </div>
          </WorkspaceCard>

          <WorkspaceCard title="Custom themes" description="Enterprise merchants can upload JSON theme packages and keep a private storefront catalog.">
            <div className="grid gap-4">
              <div className="rounded-2xl border border-border/60 px-4 py-3">
                <label className="grid gap-2 text-sm font-medium text-foreground">
                  Import theme package
                  <input
                    type="file"
                    accept="application/json,.json"
                    className="text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
                    onChange={(event) => void importCustomThemePackage(event.target.files?.[0])}
                    disabled={!themeAccess.canUseCustomThemeUpload || saving}
                  />
                </label>
                {!themeAccess.canUseCustomThemeUpload ? (
                  <p className="mt-2 text-xs text-amber-600">Custom theme upload is an Enterprise feature.</p>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">Expected JSON includes `themeId`, `name`, optional `preview`, and `config`.</p>
                )}
              </div>
              <div className="grid gap-3">
                {customThemes.length ? (
                  customThemes.map((theme) => (
                    <div key={theme.id || theme.themeId} className="rounded-3xl border border-border/60 bg-card/80 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="neutral">Custom</Badge>
                            <Badge variant="neutral">{theme.plan || "ENTERPRISE"}</Badge>
                            <Badge variant="neutral">{theme.version || "1.0.0"}</Badge>
                          </div>
                          <p className="mt-2 text-sm font-medium text-foreground">{theme.name || theme.themeId || "Custom theme"}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{theme.preview || "Merchant uploaded theme package"}</p>
                          {theme.versionNotes ? (
                            <p className="mt-2 text-xs text-muted-foreground">Notes: {theme.versionNotes}</p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => applyPreset(String(theme.id || theme.themeId || ""))}
                            disabled={saving}
                          >
                            Select
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void exportCustomThemePackage(String(theme.id || theme.themeId || ""))}
                            disabled={saving}
                          >
                            Export
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void removeCustomThemePackage(String(theme.id || theme.themeId || ""))}
                            disabled={saving || String(themeId) === String(theme.id || theme.themeId || "")}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                    No custom themes imported yet.
                  </div>
                )}
              </div>
            </div>
          </WorkspaceCard>

          <WorkspaceCard title="Brand and colors" description="Logo, brand name, and core color tokens update the preview instantly.">
            <div className="grid gap-4">
              <TextInput label="Shop name" value={shopName} onChange={(event) => setShopName(event.target.value)} />
              <TextInput label="Logo URL" value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} />
              <div className="grid gap-4 md:grid-cols-2">
                <ColorField label="Primary" value={draft.colors.primary} onChange={(value) => setDraft((current) => ({ ...current, colors: { ...current.colors, primary: value } }))} />
                <ColorField label="Secondary" value={draft.colors.secondary} onChange={(value) => setDraft((current) => ({ ...current, colors: { ...current.colors, secondary: value } }))} />
                <ColorField label="Background" value={draft.colors.background} onChange={(value) => setDraft((current) => ({ ...current, colors: { ...current.colors, background: value } }))} />
                <ColorField label="Text" value={draft.colors.text} onChange={(value) => setDraft((current) => ({ ...current, colors: { ...current.colors, text: value } }))} />
              </div>
            </div>
          </WorkspaceCard>

          <WorkspaceCard title="Media library" description="Save hero visuals once, then reuse them across themes and sections.">
            <div className="grid gap-4">
              <div className="rounded-2xl border border-border/60 px-4 py-3">
                <label className="grid gap-2 text-sm font-medium text-foreground">
                  Upload theme asset
                  <input
                    type="file"
                    accept="image/*"
                    className="text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
                    onChange={(event) => void saveMediaToLibrary(event.target.files?.[0])}
                    disabled={!themeAccess.canUploadHeroMedia || saving}
                  />
                </label>
                {!themeAccess.canUploadHeroMedia ? (
                  <p className="mt-2 text-xs text-amber-600">Reusable media library is a Pro feature.</p>
                ) : null}
              </div>
              <div className="grid gap-3">
                {mediaAssets.length ? (
                  mediaAssets.slice(0, 8).map((asset) => (
                    <div key={asset.assetId || asset.name} className="rounded-3xl border border-border/60 bg-card/80 p-4">
                      <div className="flex gap-4">
                        <div
                          className="h-20 w-20 shrink-0 rounded-2xl border border-border/50 bg-center bg-cover bg-no-repeat"
                          style={{ backgroundImage: asset.dataUrl ? `url(${asset.dataUrl})` : undefined }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{asset.name || "Theme asset"}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{asset.alt || "No alt text"}</p>
                          {asset.tags?.length ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {asset.tags.map((tag) => (
                                <Badge key={`${asset.assetId}-${tag}`} variant="neutral">{tag}</Badge>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => asset.assetId ? void removeMediaAsset(asset.assetId) : undefined}
                          disabled={saving || !asset.assetId}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                    No saved assets yet. Upload a hero image once and reuse it across sections.
                  </div>
                )}
              </div>
            </div>
          </WorkspaceCard>

          <WorkspaceCard title="Typography and layout" description="Tune fonts, spacing, header style, and product density without touching code.">
            <div className="grid gap-4">
              <SelectDropdown
                label="Font"
                value={draft.typography.fontFamily}
                onValueChange={(value) => setDraft((current) => ({ ...current, typography: { ...current.typography, fontFamily: value as MerchantThemeConfig["typography"]["fontFamily"] } }))}
                options={["Poppins", "Sora", "Inter", "Roboto"].map((value) => ({ label: value, value }))}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <SelectDropdown
                  label="Header style"
                  value={draft.layout.headerStyle}
                  onValueChange={(value) => setDraft((current) => ({ ...current, layout: { ...current.layout, headerStyle: value as MerchantThemeConfig["layout"]["headerStyle"] } }))}
                  options={[
                    { label: "Left", value: "left" },
                    { label: "Centered", value: "centered" },
                    { label: "Minimal", value: "minimal" },
                  ]}
                />
                <SelectDropdown
                  label="Product card"
                  value={draft.components.productCard}
                  onValueChange={(value) => setDraft((current) => ({ ...current, components: { productCard: value as MerchantThemeConfig["components"]["productCard"] } }))}
                  options={[
                    { label: "Minimal", value: "minimal" },
                    { label: "Modern", value: "modern" },
                    { label: "Detailed", value: "detailed" },
                  ]}
                />
                <SelectDropdown
                  label="Products view"
                  value={draft.layout.productListStyle}
                  onValueChange={(value) => setDraft((current) => ({ ...current, layout: { ...current.layout, productListStyle: value as MerchantThemeConfig["layout"]["productListStyle"] } }))}
                  options={[
                    { label: "Grid", value: "grid" },
                    { label: "List", value: "list" },
                  ]}
                />
                <SelectDropdown
                  label="Spacing"
                  value={draft.layout.spacing}
                  onValueChange={(value) => setDraft((current) => ({ ...current, layout: { ...current.layout, spacing: value as MerchantThemeConfig["layout"]["spacing"] } }))}
                  options={[
                    { label: "Compact", value: "compact" },
                    { label: "Comfortable", value: "comfortable" },
                    { label: "Spacious", value: "spacious" },
                  ]}
                />
              </div>
              <SelectDropdown
                label="Columns"
                value={String(draft.layout.productColumns)}
                onValueChange={(value) => setDraft((current) => ({ ...current, layout: { ...current.layout, productColumns: Number(value) as MerchantThemeConfig["layout"]["productColumns"] } }))}
                options={["1", "2", "3", "4"].map((value) => ({ label: `${value} columns`, value }))}
              />
            </div>
          </WorkspaceCard>

          <WorkspaceCard title="Section builder" description="Drag sections to reorder, edit copy inline, or add removed blocks back into the homepage.">
            <div className="grid gap-4">
              {draft.homepageSections.map((section, index) => (
                <div
                  key={section.id}
                  draggable
                  onDragStart={() => setDraggedId(section.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (draggedId) reorderSection(draggedId, section.id);
                    setDraggedId(null);
                  }}
                  onDragEnd={() => setDraggedId(null)}
                  className={`rounded-3xl border p-4 ${draggedId === section.id ? "border-primary/60 bg-primary/5" : "border-border/60 bg-card/80"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Section {index + 1}</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{section.type}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => moveSection(section.id, "up")} disabled={index === 0}>
                        Up
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => moveSection(section.id, "down")} disabled={index === draft.homepageSections.length - 1}>
                        Down
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeSection(section.id)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4">
                    <label className="flex items-center gap-3 rounded-2xl border border-border/50 px-3 py-3">
                      <Checkbox checked={section.enabled} onCheckedChange={() => updateSection(section.id, { enabled: !section.enabled })} />
                      <span className="text-sm font-medium text-foreground">Visible on storefront</span>
                    </label>
                    <TextInput label="Section title" value={section.title} onChange={(event) => updateSection(section.id, { title: event.target.value })} />
                    <TextInput label="Section subtitle" value={section.subtitle} onChange={(event) => updateSection(section.id, { subtitle: event.target.value })} />
                    <div className="grid gap-4 md:grid-cols-2">
                      <TextInput label="CTA label" value={section.ctaLabel || ""} onChange={(event) => updateSection(section.id, { ctaLabel: event.target.value })} />
                      <TextInput label="CTA link" value={section.ctaLink || ""} onChange={(event) => updateSection(section.id, { ctaLink: event.target.value })} />
                      <SelectDropdown
                        label="Section style"
                        value={section.style || "default"}
                        onValueChange={(value) => updateSection(section.id, { style: value as HomepageSection["style"] })}
                        options={[
                          { label: "Default", value: "default" },
                          { label: "Accent", value: "accent" },
                          { label: "Minimal", value: "minimal" },
                        ]}
                      />
                    </div>
                    {section.type === "hero" ? (
                      <div className="grid gap-4">
                        <TextInput
                          label="Hero image URL"
                          value={section.config?.imageUrl || ""}
                          onChange={(event) => updateSectionConfig(section.id, { imageUrl: event.target.value })}
                          disabled={!themeAccess.canUploadHeroMedia}
                        />
                        <TextInput
                          label="Hero image alt"
                          value={section.config?.imageAlt || ""}
                          onChange={(event) => updateSectionConfig(section.id, { imageAlt: event.target.value })}
                          disabled={!themeAccess.canUploadHeroMedia}
                        />
                        <div className="grid gap-4 md:grid-cols-2">
                          <SelectDropdown
                            label="Hero layout"
                            value={section.config?.heroLayout || "split"}
                            onValueChange={(value) =>
                              updateSectionConfig(section.id, {
                                heroLayout: value as "split" | "centered" | "immersive",
                              })
                            }
                            options={[
                              { label: "Split", value: "split" },
                              { label: "Centered", value: "centered" },
                              { label: "Immersive", value: "immersive" },
                            ]}
                            disabled={!themeAccess.canUseHeroLayouts}
                          />
                          <SelectDropdown
                            label="Media fit"
                            value={section.config?.mediaFit || "cover"}
                            onValueChange={(value) =>
                              updateSectionConfig(section.id, {
                                mediaFit: value as "cover" | "contain" | "soft",
                              })
                            }
                            options={[
                              { label: "Cover", value: "cover" },
                              { label: "Contain", value: "contain" },
                              { label: "Soft frame", value: "soft" },
                            ]}
                            disabled={!themeAccess.canUploadHeroMedia}
                          />
                        </div>
                        <div className="rounded-2xl border border-border/60 px-4 py-3">
                          <label className="grid gap-2 text-sm font-medium text-foreground">
                            Upload hero image
                            <input
                              type="file"
                              accept="image/*"
                              className="text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
                              onChange={(event) => void uploadSectionImage(section.id, event.target.files?.[0])}
                              disabled={!themeAccess.canUploadHeroMedia}
                            />
                          </label>
                          {!themeAccess.canUploadHeroMedia ? (
                            <p className="mt-2 text-xs text-amber-600">Hero media upload is a Pro feature.</p>
                          ) : null}
                        </div>
                        <SelectDropdown
                          label="Pick from media library"
                          value=""
                          onValueChange={(value) => {
                            const asset = mediaAssets.find((item) => String(item.assetId || "") === value);
                            if (!asset?.dataUrl) return;
                            updateSectionConfig(section.id, {
                              imageUrl: asset.dataUrl,
                              imageAlt: asset.alt || asset.name || "",
                            });
                          }}
                          options={[
                            { label: "Select saved asset", value: "" },
                            ...mediaAssets.map((asset) => ({
                              label: asset.name || asset.alt || "Theme asset",
                              value: String(asset.assetId || ""),
                            })),
                          ]}
                          disabled={!themeAccess.canUploadHeroMedia || !mediaAssets.length}
                        />
                      </div>
                    ) : null}
                    {section.type === "featuredProducts" || section.type === "offers" ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <SelectDropdown
                          label="Product collection"
                          value={section.config?.productCollection || "recommended"}
                          onValueChange={(value) => updateSectionConfig(section.id, { productCollection: value as "recommended" | "featured" | "flash" | "recent" })}
                          options={[
                            { label: "Recommended", value: "recommended" },
                            { label: "Featured", value: "featured" },
                            { label: "Flash deals", value: "flash" },
                            { label: "Recently viewed", value: "recent" },
                          ]}
                        />
                        <TextInput
                          label="Max items"
                          value={String(section.config?.maxItems ?? "")}
                          onChange={(event) => updateSectionConfig(section.id, { maxItems: Number(event.target.value || 0) || undefined })}
                        />
                        <SelectDropdown
                          label="Section columns"
                          value={String(section.config?.productColumns || 4)}
                          onValueChange={(value) =>
                            updateSectionConfig(section.id, {
                              productColumns: Number(value) as 2 | 3 | 4,
                            })
                          }
                          options={[
                            { label: "2 columns", value: "2" },
                            { label: "3 columns", value: "3" },
                            { label: "4 columns", value: "4" },
                          ]}
                          disabled={!themeAccess.canAdjustSectionColumns}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}

              <div className="rounded-3xl border border-dashed border-border/70 p-4">
                <p className="text-sm font-medium text-foreground">Add section</p>
                <p className="mt-1 text-xs text-muted-foreground">Missing sections can be added back into the homepage at any time.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {availableSectionTypes.length ? (
                    availableSectionTypes.map((type) => (
                      <Button key={type} size="sm" variant="secondary" onClick={() => addSection(type)}>
                        Add {type}
                      </Button>
                    ))
                  ) : (
                    <Badge variant="neutral">All section types already in use</Badge>
                  )}
                </div>
              </div>
            </div>
          </WorkspaceCard>

          <WorkspaceCard title="Publish history" description="Review recent storefront publishes and restore a previous live snapshot in one click.">
            <div className="grid gap-3">
              {history.length ? (
                history.map((entry, index) => (
                  <div key={entry.snapshotId || `${entry.themeId}-${index}`} className="rounded-3xl border border-border/60 bg-card/80 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={entry.mode === "rollback" ? "warning" : "neutral"}>
                            {entry.mode === "rollback" ? "Rollback" : "Publish"}
                          </Badge>
                          <Badge variant="neutral">{entry.preview?.themeName || entry.themeId || "Theme snapshot"}</Badge>
                          {entry.versionLabel ? <Badge variant="neutral">{entry.versionLabel}</Badge> : null}
                          <Badge variant="neutral">{entry.changeCount ?? 0} changes</Badge>
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {entry.actorName || "Merchant"}{entry.actorRole ? ` • ${entry.actorRole}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.createdAt || "Unknown time"}
                          {entry.sourceSnapshotId ? ` • from ${entry.sourceSnapshotId.slice(0, 8)}` : ""}
                        </p>
                      </div>
                      {entry.diffSummary?.length ? (
                        <div className="grid gap-1">
                          {entry.diffSummary.slice(0, 3).map((item, itemIndex) => (
                            <p key={`${entry.snapshotId || index}-${item.key || itemIndex}`} className="text-xs text-muted-foreground">
                              {item.label || "Change"}: {item.before || "Not set"} -> <span className="font-medium text-foreground">{item.after || "Not set"}</span>
                            </p>
                          ))}
                        </div>
                      ) : null}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setSelectedHistoryId((current) =>
                            current === String(entry.snapshotId || "") ? null : String(entry.snapshotId || "")
                          )
                        }
                      >
                        {selectedHistoryId === String(entry.snapshotId || "") ? "Hide diff" : "Compare"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void rollback(String(entry.snapshotId || ""))}
                        disabled={saving || !entry.snapshotId}
                      >
                        Restore
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                  Theme history will appear here after the first publish.
                </div>
              )}
              {selectedHistoryEntry ? (
                <div className="rounded-3xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Rollback diff preview</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Current live theme vs snapshot {selectedHistoryEntry.preview?.themeName || selectedHistoryEntry.themeId || "theme"}.
                      </p>
                    </div>
                    <Badge variant="neutral">{selectedHistoryDiff.length} changes</Badge>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {selectedHistoryDiff.length ? (
                      selectedHistoryDiff.map((item) => (
                        <div key={item.label} className="rounded-2xl border border-border/50 bg-background/80 p-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                          <p className="mt-2 text-sm text-muted-foreground">Live: {item.before}</p>
                          <p className="mt-1 text-sm font-medium text-foreground">Snapshot: {item.after}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-border/50 bg-background/80 p-3 text-sm text-muted-foreground">
                        This snapshot matches the current live theme.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </WorkspaceCard>
        </div>

        <WorkspaceCard title="Live preview" description="Preview desktop and mobile storefront states before saving.">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <Button variant={deviceMode === "desktop" ? "primary" : "secondary"} onClick={() => setDeviceMode("desktop")}>
                Desktop
              </Button>
              <Button variant={deviceMode === "mobile" ? "primary" : "secondary"} onClick={() => setDeviceMode("mobile")}>
                Mobile
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant={viewMode === "draft" ? "primary" : "secondary"} onClick={() => setViewMode("draft")}>
                Draft preview
              </Button>
              <Button variant={viewMode === "live" ? "primary" : "secondary"} onClick={() => setViewMode("live")}>
                Live preview
              </Button>
            </div>
            <Badge variant="neutral">{draft.layout.productListStyle} / {draft.components.productCard}</Badge>
          </div>
          <ThemePreview shopName={shopName} logoUrl={logoUrl} config={previewConfig} deviceMode={deviceMode} />
        </WorkspaceCard>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-3 rounded-2xl border border-border/60 px-3 py-2">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-14 rounded-lg border-0 bg-transparent p-0" />
        <TextInput value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </div>
  );
}

function buildPreviewAnalytics(config: MerchantThemeConfig) {
  const enabledSections = config.homepageSections.filter((section) => section.enabled);
  const ctaSections = enabledSections.filter((section) => section.ctaLabel || section.ctaLink).length;
  const heroSection = enabledSections.find((section) => section.type === "hero");
  const commerceSections = enabledSections.filter((section) => section.type === "featuredProducts" || section.type === "offers");

  return enabledSections.map((section, index) => {
    if (section.type === "hero") {
      const heroLayout = section.config?.heroLayout || "split";
      const heroMedia = section.config?.imageUrl ? "Image attached" : "No hero media";
      return {
        id: section.id,
        label: `${index + 1}. Hero`,
        metric: heroLayout === "immersive" ? "High attention" : heroLayout === "centered" ? "Story-led" : "Balanced reach",
        detail: `${heroMedia} • CTA ${section.ctaLabel ? "ready" : "missing"}`,
      };
    }

    if (section.type === "featuredProducts" || section.type === "offers") {
      return {
        id: section.id,
        label: `${index + 1}. ${section.type === "offers" ? "Offers" : "Products"}`,
        metric: `${section.config?.productColumns || config.layout.productColumns} cols`,
        detail: `${section.config?.productCollection || "recommended"} • max ${section.config?.maxItems || "all"} items`,
      };
    }

    return {
      id: section.id,
      label: `${index + 1}. ${section.type}`,
      metric: section.style || "default",
      detail: section.subtitle ? "Copy present" : "Needs supporting copy",
    };
  }).concat([
    {
      id: "summary-sections",
      label: "Section mix",
      metric: `${enabledSections.length} active`,
      detail: `${commerceSections.length} commerce blocks • ${ctaSections} CTA-ready sections`,
    },
    {
      id: "summary-density",
      label: "Merch density",
      metric: config.layout.productListStyle === "list" ? "Editorial" : `${config.layout.productColumns} up grid`,
      detail: `Spacing ${config.layout.spacing} • card ${config.components.productCard}`,
    },
    {
      id: "summary-hero",
      label: "Hero readiness",
      metric: heroSection?.config?.imageUrl ? "Campaign-ready" : "Needs visual",
      detail: heroSection ? `${heroSection.config?.heroLayout || "split"} hero` : "No hero section enabled",
    },
  ]);
}

function SectionAnalyticsPreview({ analytics }: { analytics: Array<{ id: string; label: string; metric: string; detail: string }> }) {
  return (
    <div className="mt-5 grid gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Preview analytics overlay</p>
        <Badge variant="neutral">{analytics.length} insights</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {analytics.map((item) => (
          <div key={item.id} className="rounded-2xl border border-border/60 bg-background/70 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{item.metric}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThemePreview({
  shopName,
  logoUrl,
  config,
  deviceMode,
}: {
  shopName: string;
  logoUrl: string;
  config: MerchantThemeConfig;
  deviceMode: "desktop" | "mobile";
}) {
  const products = Array.from({ length: config.layout.productListStyle === "list" ? 3 : Math.max(2, config.layout.productColumns) }).map((_, index) => ({
    title: ["Signature Curry", "Fresh Groceries", "Weekend Bundle", "House Pick"][index] || `Product ${index + 1}`,
    price: `${420 + index * 80} BDT`,
  }));
  const analytics = buildPreviewAnalytics(config);

  return (
    <div className="mt-6 grid gap-5">
      <div className="flex justify-center rounded-[2rem] border border-border/60 bg-muted/10 p-4">
        <div
          className={`overflow-hidden rounded-[2rem] border border-border/60 shadow-[0_24px_60px_rgba(15,23,42,0.12)] ${deviceMode === "mobile" ? "w-[360px]" : "w-full max-w-5xl"}`}
          style={{ background: config.colors.background, color: config.colors.text, fontFamily: config.typography.fontFamily }}
        >
          <div className="px-5 py-4" style={{ background: `linear-gradient(135deg, ${config.colors.primary}, ${config.colors.secondary})`, color: config.colors.buttonText }}>
            <div className={`flex gap-3 ${config.layout.headerStyle === "centered" ? "justify-center text-center" : "justify-between"}`}>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] opacity-80">DokanX storefront</p>
                <h3 className={`mt-2 ${config.typography.headingStyle === "impact" ? "text-3xl font-black" : config.typography.headingStyle === "minimal" ? "text-2xl font-semibold" : "text-3xl font-bold"}`}>
                  {shopName}
                </h3>
              </div>
              {config.layout.headerStyle !== "minimal" ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-xs">
                  {logoUrl ? "Logo" : "DX"}
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-5 p-5">
            {config.homepageSections.filter((section) => section.enabled).map((section) => {
            if (section.type === "hero") {
              const heroLayout = section.config?.heroLayout || "split";
              const mediaFit = section.config?.mediaFit || "cover";
              return (
                <div
                  key={section.id}
                  className={`rounded-[1.5rem] p-5 ${heroLayout === "centered" ? "text-center" : ""}`}
                  style={{
                    background:
                      heroLayout === "immersive"
                        ? `linear-gradient(145deg, ${config.colors.primary}, ${config.colors.secondary})`
                        : `linear-gradient(135deg, ${config.colors.surface}, ${config.colors.secondary}22)`,
                    color: heroLayout === "immersive" ? config.colors.buttonText : config.colors.text,
                  }}
                >
                  <div className={`grid gap-5 ${heroLayout === "split" ? "lg:grid-cols-[1.1fr_0.9fr] lg:items-center" : ""}`}>
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em]" style={{ color: heroLayout === "immersive" ? `${config.colors.buttonText}CC` : `${config.colors.text}99` }}>{section.type}</p>
                      <h4 className="mt-3 text-2xl font-semibold">{section.title}</h4>
                      <p className="mt-2 text-sm" style={{ color: heroLayout === "immersive" ? `${config.colors.buttonText}D9` : `${config.colors.text}B3` }}>{section.subtitle}</p>
                      <button className="mt-4 rounded-full px-4 py-2 text-sm font-semibold" style={{ background: heroLayout === "immersive" ? config.colors.background : config.colors.primary, color: heroLayout === "immersive" ? config.colors.text : config.colors.buttonText }}>
                        {section.ctaLabel || "Open"}
                      </button>
                    </div>
                    <div
                      className={`min-h-[180px] rounded-[1.5rem] border border-white/20 ${mediaFit === "soft" ? "p-4" : ""}`}
                      style={{
                        background: section.config?.imageUrl
                          ? mediaFit === "soft"
                            ? `${config.colors.surface}`
                            : `center / ${mediaFit === "contain" ? "contain" : "cover"} no-repeat url(${section.config.imageUrl})`
                          : `linear-gradient(135deg, ${config.colors.primary}22, ${config.colors.secondary}33)`,
                      }}
                    >
                      {section.config?.imageUrl && mediaFit === "soft" ? (
                        <div
                          className="h-full min-h-[148px] rounded-[1.15rem]"
                          style={{ background: `center / contain no-repeat url(${section.config.imageUrl})` }}
                        />
                      ) : !section.config?.imageUrl ? (
                        <div className="flex h-full min-h-[148px] items-center justify-center text-xs" style={{ color: heroLayout === "immersive" ? `${config.colors.buttonText}B3` : `${config.colors.text}80` }}>
                          Upload a banner to preview richer hero layouts.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            }

            if (section.type === "categories") {
              return (
                <div key={section.id} className="space-y-3">
                  <div>
                    <h4 className="text-xl font-semibold">{section.title}</h4>
                    <p className="text-sm text-muted-foreground">{section.subtitle}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["Groceries", "Fashion", "Electronics", "Offers"].map((item) => (
                      <span key={item} className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: `${config.colors.secondary}18`, color: config.colors.text }}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              );
            }

            if (section.type === "featuredProducts" || section.type === "offers") {
              const previewColumns = section.config?.productColumns || config.layout.productColumns;
              return (
                <div key={section.id} className="space-y-4">
                  <div>
                    <h4 className="text-xl font-semibold">{section.title}</h4>
                    <p className="text-sm text-muted-foreground">{section.subtitle}</p>
                  </div>
                  <div className={`grid ${config.layout.productListStyle === "list" ? "grid-cols-1" : deviceMode === "mobile" ? "grid-cols-1" : previewColumns >= 4 ? "grid-cols-4" : previewColumns === 3 ? "grid-cols-3" : "grid-cols-2"}`} style={{ gap: config.layout.spacing === "compact" ? "12px" : config.layout.spacing === "spacious" ? "20px" : "16px" }}>
                    {products.map((product) => (
                      <Card
                        key={`${section.id}-${product.title}`}
                        className="border-border/60"
                        style={{
                          background: config.colors.surface,
                          borderRadius: config.components.productCard === "minimal" ? "18px" : config.components.productCard === "detailed" ? "24px" : "20px",
                        }}
                      >
                        <div className="aspect-[4/3] rounded-2xl" style={{ background: `linear-gradient(135deg, ${config.colors.primary}20, ${config.colors.secondary}20)` }} />
                        <CardTitle className="mt-4 text-lg">{product.title}</CardTitle>
                        <CardDescription className="mt-2">{product.price}</CardDescription>
                        <button className="mt-4 w-full rounded-full px-4 py-2 text-sm font-semibold" style={{ background: config.colors.primary, color: config.colors.buttonText }}>
                          {section.ctaLabel || "View all"}
                        </button>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            }

              return (
                <div key={section.id} className="rounded-[1.5rem] border border-border/60 px-5 py-4 text-sm" style={{ background: config.colors.surface }}>
                  <h4 className="text-xl font-semibold">{section.title}</h4>
                  <p className="mt-2 text-muted-foreground">{section.subtitle}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <SectionAnalyticsPreview analytics={analytics} />
    </div>
  );
}
