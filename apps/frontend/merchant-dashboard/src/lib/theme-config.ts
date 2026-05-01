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

export type MerchantThemeConfig = {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    buttonText: string;
  };
  typography: {
    fontFamily: "Poppins" | "Sora" | "Inter" | "Roboto";
    headingStyle: "balanced" | "impact" | "minimal";
  };
  layout: {
    productListStyle: "grid" | "list";
    productColumns: 1 | 2 | 3 | 4;
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

export const DEFAULT_SECTION_LIBRARY: Record<ThemeSectionType, Omit<HomepageSection, "id">> = {
  hero: {
    type: "hero",
    enabled: true,
    title: "Merchant-controlled storefront experience",
    subtitle: "Colors, layout, cards, and sections are all driven by saved config.",
    ctaLabel: "Shop now",
    ctaLink: "/products",
    config: { imageUrl: "", imageAlt: "", heroLayout: "split", mediaFit: "cover" },
    style: "accent",
  },
  featuredProducts: {
    type: "featuredProducts",
    enabled: true,
    title: "Recommendations",
    subtitle: "Products blended from order history, live search, and your location context.",
    ctaLabel: "View all",
    ctaLink: "/products",
    config: { productCollection: "recommended", maxItems: 12, productColumns: 4 },
    style: "default",
  },
  categories: {
    type: "categories",
    enabled: true,
    title: "Shops near you",
    subtitle: "Use filters to narrow district, thana, market, and shop.",
    ctaLabel: "Explore shops",
    ctaLink: "/shops",
    style: "minimal",
  },
  offers: {
    type: "offers",
    enabled: true,
    title: "Flash deals",
    subtitle: "Fast-moving offers near your current district and market selection.",
    ctaLabel: "See offers",
    ctaLink: "/products",
    config: { productCollection: "flash", maxItems: 8, productColumns: 3 },
    style: "accent",
  },
  testimonials: {
    type: "testimonials",
    enabled: false,
    title: "Popular shops",
    subtitle: "High-trust stores customers around you revisit frequently.",
    ctaLabel: "Browse trusted shops",
    ctaLink: "/shops",
    style: "default",
  },
};

export const DEFAULT_THEME_CONFIG: MerchantThemeConfig = {
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
    { id: "hero", ...DEFAULT_SECTION_LIBRARY.hero },
    { id: "featuredProducts", ...DEFAULT_SECTION_LIBRARY.featuredProducts },
    { id: "categories", ...DEFAULT_SECTION_LIBRARY.categories },
    { id: "offers", ...DEFAULT_SECTION_LIBRARY.offers },
    { id: "testimonials", ...DEFAULT_SECTION_LIBRARY.testimonials },
  ],
};
