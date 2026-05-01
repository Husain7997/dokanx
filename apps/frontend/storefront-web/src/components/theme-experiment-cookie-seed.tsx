"use client";

import { useEffect } from "react";

import { useStorefrontTheme } from "@/components/storefront-theme-provider";

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split("=")[1] || "";
}

export function ThemeExperimentCookieSeed() {
  const theme = useStorefrontTheme();

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!theme.experiment?.isEnabled) return;
    if (getCookie("dx_theme_variant")) return;

    const split = Math.max(10, Math.min(90, Number(theme.experiment?.trafficSplit || 50)));
    const assigned = Math.random() * 100 < split ? "A" : "B";
    document.cookie = `dx_theme_variant=${assigned}; path=/; max-age=${60 * 60 * 24 * 14}; samesite=lax`;
  }, [theme.experiment?.isEnabled, theme.experiment?.trafficSplit]);

  return null;
}
