export const colors = {
  light: {
    background: "hsl(36 33% 97%)",
    foreground: "hsl(222 30% 12%)",
    surface: "hsl(0 0% 100%)",
    surfaceMuted: "hsl(32 25% 94%)",
    border: "hsl(28 17% 84%)",
    primary: "hsl(18 79% 53%)",
    primaryForeground: "hsl(36 33% 97%)",
    secondary: "hsl(212 50% 18%)",
    secondaryForeground: "hsl(36 33% 97%)",
    mutedForeground: "hsl(218 14% 41%)",
    success: "hsl(145 63% 42%)",
    warning: "hsl(35 92% 52%)",
    danger: "hsl(0 79% 63%)"
  },
  dark: {
    background: "hsl(224 29% 8%)",
    foreground: "hsl(36 33% 97%)",
    surface: "hsl(223 24% 11%)",
    surfaceMuted: "hsl(222 22% 15%)",
    border: "hsl(223 15% 24%)",
    primary: "hsl(21 95% 58%)",
    primaryForeground: "hsl(222 30% 12%)",
    secondary: "hsl(213 27% 90%)",
    secondaryForeground: "hsl(222 30% 12%)",
    mutedForeground: "hsl(219 12% 68%)",
    success: "hsl(145 58% 50%)",
    warning: "hsl(39 88% 56%)",
    danger: "hsl(0 85% 67%)"
  }
} as const;

export const spacing = {
  0: "0rem",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem"
} as const;

export const typography = {
  fontSans: '"Inter Variable", "Inter", sans-serif',
  fontDisplay: '"Cal Sans", "Inter Variable", sans-serif',
  sizes: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem"
  }
} as const;

export const radius = {
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.5rem",
  full: "999px"
} as const;

export const shadows = {
  sm: "0 1px 2px rgba(15, 23, 42, 0.06)",
  md: "0 12px 30px rgba(15, 23, 42, 0.08)",
  lg: "0 24px 80px rgba(15, 23, 42, 0.14)"
} as const;

export const zindex = {
  base: 0,
  dropdown: 20,
  sticky: 30,
  overlay: 40,
  modal: 50,
  toast: 60,
  commandPalette: 70
} as const;
