"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ThemeMode =
  | "light"
  | "dark"
  | "system"
  | "merchant-theme"
  | "admin-theme"
  | "storefront-theme";

type ThemeContextValue = {
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveTheme(theme: ThemeMode) {
  if (theme === "merchant-theme" || theme === "storefront-theme") {
    return "light";
  }

  if (theme === "admin-theme") {
    return "dark";
  }

  if (theme !== "system") {
    return theme;
  }

  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({
  children,
  defaultTheme = "system"
}: {
  children: ReactNode;
  defaultTheme?: ThemeMode;
}) {
  const [theme, setTheme] = useState<ThemeMode>(defaultTheme);
  const resolvedTheme = resolveTheme(theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme === "system" ? resolvedTheme : theme;
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme, theme]);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [resolvedTheme, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
