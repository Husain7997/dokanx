export const dokanxBrand = {
  colors: {
    primary: "#0B1E3C",
    accentStart: "#FF7A00",
    accentEnd: "#FFA500",
    background: "#F4F7FB",
    surface: "#FFFFFF",
    surfaceAlt: "#EAF0F8",
    text: "#0B1E3C",
    muted: "#5F6F86",
    border: "#D7DFEA",
    mono: "#111111"
  },
  gradient: "linear-gradient(135deg, #FF7A00 0%, #FFA500 100%)",
  clearSpace: {
    sm: 8,
    md: 12,
    lg: 16
  }
} as const;

export type DokanXLogoVariant = "icon" | "full" | "mono";
export type DokanXLogoSize = "sm" | "md" | "lg";
