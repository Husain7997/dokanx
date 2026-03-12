import { colors, radius, shadows, spacing, typography, zindex } from "../tokens";

export const lightTheme = {
  name: "light",
  colors: colors.light,
  spacing,
  typography,
  radius,
  shadows,
  zindex
} as const;

export const darkTheme = {
  name: "dark",
  colors: colors.dark,
  spacing,
  typography,
  radius,
  shadows,
  zindex
} as const;

export const merchantTheme = {
  ...lightTheme,
  name: "merchant-theme",
  accent: "merchant"
} as const;

export const adminTheme = {
  ...darkTheme,
  name: "admin-theme",
  accent: "admin"
} as const;

export const storefrontTheme = {
  ...lightTheme,
  name: "storefront-theme",
  accent: "storefront"
} as const;
