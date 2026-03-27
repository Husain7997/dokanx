import * as Keychain from "react-native-keychain";
import { useColorScheme } from "react-native";
import { create } from "zustand";

const MERCHANT_UI_SERVICE = "dokanx.mobile.merchant.ui";

export type MerchantThemeMode = "light" | "dark" | "system";
export type MerchantLanguage = "en" | "bn";

type MerchantUiPreferences = {
  themeMode: MerchantThemeMode;
  language: MerchantLanguage;
};

type MerchantUiState = MerchantUiPreferences & {
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setThemeMode: (themeMode: MerchantThemeMode) => Promise<void>;
  setLanguage: (language: MerchantLanguage) => Promise<void>;
};

const defaultPreferences: MerchantUiPreferences = {
  themeMode: "system",
  language: "en",
};

async function persistPreferences(preferences: MerchantUiPreferences) {
  await Keychain.setGenericPassword("merchant-ui", JSON.stringify(preferences), {
    service: MERCHANT_UI_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

async function readPreferences(): Promise<MerchantUiPreferences> {
  const credentials = await Keychain.getGenericPassword({ service: MERCHANT_UI_SERVICE });
  if (!credentials) {
    return defaultPreferences;
  }

  try {
    const parsed = JSON.parse(credentials.password || "{}");
    return {
      themeMode: parsed.themeMode === "light" || parsed.themeMode === "dark" || parsed.themeMode === "system" ? parsed.themeMode : defaultPreferences.themeMode,
      language: parsed.language === "bn" ? "bn" : "en",
    };
  } catch {
    return defaultPreferences;
  }
}

export const useMerchantUiStore = create<MerchantUiState>((set, get) => ({
  ...defaultPreferences,
  isHydrated: false,
  hydrate: async () => {
    try {
      const preferences = await readPreferences();
      set({ ...preferences, isHydrated: true });
    } catch {
      set({ ...defaultPreferences, isHydrated: true });
    }
  },
  setThemeMode: async (themeMode) => {
    const next = { ...get(), themeMode };
    set({ themeMode });
    await persistPreferences({ themeMode: next.themeMode, language: next.language });
  },
  setLanguage: async (language) => {
    const next = { ...get(), language };
    set({ language });
    await persistPreferences({ themeMode: next.themeMode, language: next.language });
  },
}));

export function useResolvedMerchantTheme() {
  const themeMode = useMerchantUiStore((state) => state.themeMode);
  const systemTheme = useColorScheme();
  return themeMode === "system" ? (systemTheme === "dark" ? "dark" : "light") : themeMode;
}

export function getMerchantPalette(theme: "light" | "dark") {
  if (theme === "dark") {
    return {
      screen: "#0b1220",
      surface: "#111827",
      surfaceAlt: "#172033",
      border: "#243041",
      text: "#f9fafb",
      muted: "#9ca3af",
      accent: "#fbbf24",
      accentText: "#111827",
      dock: "rgba(15,23,42,0.98)",
      dockText: "#f9fafb",
      card: "#111827",
    };
  }

  return {
    screen: "#f8f4ef",
    surface: "#fffaf3",
    surfaceAlt: "#ffffff",
    border: "#eadfce",
    text: "#111827",
    muted: "#6b7280",
    accent: "#fbbf24",
    accentText: "#111827",
    dock: "rgba(17,24,39,0.96)",
    dockText: "#f9fafb",
    card: "#ffffff",
  };
}
