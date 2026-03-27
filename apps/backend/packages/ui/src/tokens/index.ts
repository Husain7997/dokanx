export const colors = {
  light: {
    primary: "#2563EB",
    secondary: "#10B981",
    accent: "#F59E0B",
    success: "#22C55E",
    warning: "#F97316",
    danger: "#EF4444",
    background: "#F8FAFC",
    card: "#FFFFFF",
    border: "#E2E8F0",
    text: "#111827",
    mutedText: "#6B7280"
  },
  dark: {
    primary: "#2563EB",
    secondary: "#10B981",
    accent: "#F59E0B",
    success: "#22C55E",
    warning: "#F97316",
    danger: "#EF4444",
    background: "#0B1120",
    card: "#111827",
    border: "#1F2937",
    text: "#F8FAFC",
    mutedText: "#94A3B8"
  }
} as const;

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  "2xl": "48px",
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
  fontPrimary: '"Inter", "Inter Variable", sans-serif',
  fontSecondary: '"Poppins", "Inter", sans-serif',
  scale: {
    headingXl: "2.25rem",
    headingLg: "1.875rem",
    headingMd: "1.5rem",
    bodyLarge: "1.125rem",
    bodyRegular: "1rem",
    caption: "0.875rem"
  },
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
  small: "6px",
  medium: "10px",
  large: "16px",
  pill: "999px",
  sm: "0.375rem",
  md: "0.625rem",
  lg: "1rem",
  xl: "1.25rem",
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
