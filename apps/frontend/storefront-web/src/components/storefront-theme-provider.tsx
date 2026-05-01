"use client";

import type { CSSProperties, ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";

import type { StorefrontThemeState } from "@/lib/theme-config";

const StorefrontThemeContext = createContext<StorefrontThemeState | null>(null);

export function StorefrontThemeProvider({
  theme,
  children,
}: {
  theme: StorefrontThemeState;
  children: ReactNode;
}) {
  const style = useMemo(
    () =>
      ({
        "--theme-primary": theme.cssVariables["--theme-primary"],
        "--theme-secondary": theme.cssVariables["--theme-secondary"],
        "--theme-background": theme.cssVariables["--theme-background"],
        "--theme-surface": theme.cssVariables["--theme-surface"],
        "--theme-text": theme.cssVariables["--theme-text"],
        "--theme-button-text": theme.cssVariables["--theme-button-text"],
        "--theme-font-family": theme.cssVariables["--theme-font-family"],
        "--theme-columns": theme.cssVariables["--theme-columns"],
        "--theme-gap": theme.cssVariables["--theme-gap"],
        "--theme-radius": theme.cssVariables["--theme-radius"],
      }) as CSSProperties,
    [theme]
  );

  return (
    <StorefrontThemeContext.Provider value={theme}>
      <div className="dx-storefront-theme min-h-screen" style={style}>
        {children}
      </div>
    </StorefrontThemeContext.Provider>
  );
}

export function useStorefrontTheme() {
  const context = useContext(StorefrontThemeContext);
  if (!context) {
    throw new Error("useStorefrontTheme must be used within StorefrontThemeProvider");
  }
  return context;
}
