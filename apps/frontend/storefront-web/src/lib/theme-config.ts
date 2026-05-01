export type ThemeSectionType = "hero" | "featuredProducts" | "categories" | "offers" | "testimonials";

export type HomepageSection = {
  id: string;
  type: ThemeSectionType;
  enabled: boolean;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  ctaLink?: string;
  config?: {
    imageUrl?: string;
    imageAlt?: string;
    heroLayout?: "split" | "centered" | "immersive";
    mediaFit?: "cover" | "contain" | "soft";
    productCollection?: "recommended" | "featured" | "flash" | "recent";
    maxItems?: number;
    productColumns?: 2 | 3 | 4;
  };
  style?: "default" | "accent" | "minimal";
};

export type StorefrontThemeConfig = {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    buttonText: string;
  };
  typography: {
    fontFamily: string;
    headingStyle: "balanced" | "impact" | "minimal";
  };
  layout: {
    productListStyle: "grid" | "list";
    productColumns: number;
    headerStyle: "left" | "centered" | "minimal";
    footerStyle: "classic" | "stacked" | "minimal";
    spacing: "compact" | "comfortable" | "spacious";
  };
  components: {
    productCard: "minimal" | "modern" | "detailed";
  };
  sections: {
    hero: boolean;
    featuredProducts: boolean;
    categories: boolean;
    offers: boolean;
    testimonials: boolean;
  };
  sectionOrder: string[];
  homepageSections: HomepageSection[];
};

export type StorefrontThemeState = {
  themeId: string;
  themeName: string;
  category: string;
  plan: string;
  preview: string;
  experiment?: {
    experimentId?: string;
    name?: string;
    assignedVariantId?: string;
    isEnabled?: boolean;
    trafficSplit?: number;
  };
  config: StorefrontThemeConfig;
  cssVariables: Record<string, string>;
};

export const DEFAULT_STOREFRONT_THEME: StorefrontThemeState = {
  themeId: "merchant-theme",
  themeName: "Merchant Core",
  category: "default",
  plan: "FREE",
  preview: "Balanced storefront for most shops",
  experiment: {
    experimentId: "",
    name: "",
    assignedVariantId: "",
    isEnabled: false,
    trafficSplit: 50,
  },
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
    sectionOrder: ["hero", "featuredProducts", "categories", "offers", "testimonials"],
    homepageSections: [
      {
        id: "hero",
        type: "hero",
        enabled: true,
        title: "Merchant-controlled storefront experience",
        subtitle: "Colors, layout, cards, and sections are all driven by saved config.",
        ctaLabel: "Shop now",
        ctaLink: "/products",
        config: { imageUrl: "", imageAlt: "", heroLayout: "split", mediaFit: "cover" },
        style: "accent",
      },
      {
        id: "featuredProducts",
        type: "featuredProducts",
        enabled: true,
        title: "Recommendations",
        subtitle: "Products blended from order history, live search, and your location context.",
        ctaLabel: "View all",
        ctaLink: "/products",
        config: { productCollection: "recommended", maxItems: 12, productColumns: 4 },
        style: "default",
      },
      {
        id: "categories",
        type: "categories",
        enabled: true,
        title: "Shops near you",
        subtitle: "Use filters to narrow district, thana, market, and shop.",
        ctaLabel: "Explore shops",
        ctaLink: "/shops",
        style: "minimal",
      },
      {
        id: "offers",
        type: "offers",
        enabled: true,
        title: "Flash deals",
        subtitle: "Fast-moving offers near your current district and market selection.",
        ctaLabel: "See offers",
        ctaLink: "/products",
        config: { productCollection: "flash", maxItems: 8, productColumns: 3 },
        style: "accent",
      },
      {
        id: "testimonials",
        type: "testimonials",
        enabled: false,
        title: "Popular shops",
        subtitle: "High-trust stores customers around you revisit frequently.",
        ctaLabel: "Browse trusted shops",
        ctaLink: "/shops",
        style: "default",
      },
    ],
  },
  cssVariables: {
    "--theme-primary": "#0B1E3C",
    "--theme-secondary": "#FF7A00",
    "--theme-background": "#F8FAFC",
    "--theme-surface": "#FFFFFF",
    "--theme-text": "#10233D",
    "--theme-button-text": "#FFFFFF",
    "--theme-font-family": "'Poppins', ui-sans-serif, system-ui, sans-serif",
    "--theme-columns": "4",
    "--theme-gap": "1.25rem",
    "--theme-radius": "1.5rem",
  },
};
